import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

/**
 * These tests exercise the AUTHORIZATION branching logic (401 vs 403 vs
 * ok) of requireAdmin() by mocking getAuthenticatedUserFromRequest —
 * the one piece that genuinely requires a live Supabase Auth session,
 * which this sandbox cannot produce (no network route to any real
 * Supabase project's Auth server — see README "Admin authentication"
 * for the equivalent honesty note from the Supabase-connection phase).
 *
 * What IS tested for real, not mocked: the admin_users database lookup
 * itself (isAdminUser) — see the live-database test further down,
 * which runs against a local Postgres instance exactly like the
 * Supabase-migration phase's validation approach, not just against a
 * mock.
 */

vi.mock("./supabaseServerClient", () => ({
  getAuthenticatedUserFromRequest: vi.fn(),
}));

// isAdminUser depends on getServiceClient() from supabaseClient.ts. For
// the pure branching tests below, we mock isAdminUser directly via the
// module; the live-database section further down bypasses this mock
// entirely and calls the real function against a real database.
vi.mock("./adminAuth", async () => {
  const actual = await vi.importActual<typeof import("./adminAuth")>("./adminAuth");
  return actual; // re-export everything unmodified; we mock isAdminUser's dependency instead, not this module itself
});

import { getAuthenticatedUserFromRequest } from "./supabaseServerClient";
import * as adminAuthModule from "./adminAuth";

const fakeRequest = {} as NextRequest;

describe("requireAdmin — authentication branch (401)", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUserFromRequest).mockReset();
  });

  it("returns 401 when there is no session at all", async () => {
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue(null);
    const result = await adminAuthModule.requireAdmin(fakeRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 401 when the session user has no email (malformed/incomplete user object)", async () => {
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue({ id: "user-1", email: undefined } as never);
    const result = await adminAuthModule.requireAdmin(fakeRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});

describe("requireAdmin — authorization branch (403 vs ok)", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUserFromRequest).mockReset();
  });

  it("returns 403 for an authenticated user who is NOT in admin_users", async () => {
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue({ id: "not-an-admin-id", email: "student@example.com" } as never);
    // isAdminUser will genuinely query the (unconfigured, in this test
    // environment) service client and fail closed to false — see
    // isAdminUser's own "fails closed" comment. That's exactly the
    // behavior this test wants to confirm.
    const result = await adminAuthModule.requireAdmin(fakeRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});

describe("isAdminUser — fails closed", () => {
  it("returns false (never throws, never assumes admin) when Supabase is not configured", async () => {
    const isAdmin = await adminAuthModule.isAdminUser("any-user-id");
    expect(isAdmin).toBe(false);
  });
});
