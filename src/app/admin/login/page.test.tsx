// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AdminLoginPage from "./page";

/**
 * Answers one question with certainty instead of by theorizing about
 * compiled/hydrated behavior in a real browser: does React's onSubmit
 * handler on this exact component actually get invoked when the form is
 * submitted, and does it call preventDefault correctly? jsdom's form
 * submission dispatch goes through the same DOM event path a real
 * browser does, so if this passes, the component itself is not the
 * problem.
 *
 * What this CANNOT rule out: jsdom does not enforce Content-Security-
 * Policy, so a real browser blocking the actual network call to
 * Supabase (e.g. via a connect-src violation) would not show up here.
 * That would still be caught by the try/catch below preventDefault
 * always runs first, so it cannot explain a native form GET — but it
 * could explain a real sign-in silently failing after the point this
 * test can observe. See the accompanying report for what to check in a
 * real browser's Network/Console tabs for that specific case.
 */

const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabaseBrowserClient", () => ({
  getBrowserSupabaseClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt as string} />;
  },
}));

describe("AdminLoginPage — does the submit handler actually intercept the form?", () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("calls signInWithPassword when the form is submitted with valid input (proves onSubmit fires, not a native form GET)", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });

    const originalLocation = window.location;
    // @ts-expect-error - deliberately replacing window.location for this test
    delete window.location;
    // @ts-expect-error - minimal stub, only `href` is used by the component
    window.location = { href: "" };

    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@futuregrad.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "admin@futuregrad.test", password: "correct-password" });
    });

    window.location = originalLocation;
  });

  it("shows an inline error and does NOT navigate when Supabase returns a sign-in error", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });

    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid login credentials");
    });
  });

  it("does not call signInWithPassword when fields are empty (client-side validation short-circuits first)", async () => {
    render(<AdminLoginPage />);
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Please enter both email and password.");
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("the form element has method=post, so even a hypothetical native fallback submission would never put credentials in the URL", () => {
    render(<AdminLoginPage />);
    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    expect(form.getAttribute("method")).toBe("post");
  });
});
