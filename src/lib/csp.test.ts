import { describe, it, expect } from "vitest";
import { createRequire } from "module";

// security-headers.js is plain CommonJS (next.config.js can't import TS),
// so load it with require to avoid needing type declarations for it.
const require = createRequire(import.meta.url);
const { buildContentSecurityPolicy, buildSecurityHeaders } = require("../../security-headers.js") as {
  buildContentSecurityPolicy: (isDev: boolean) => string;
  buildSecurityHeaders: (isDev: boolean) => { key: string; value: string }[];
};

function directive(csp: string, name: string): string | undefined {
  return csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
}

describe("Content-Security-Policy — development vs production", () => {
  it("development policy allows 'unsafe-eval' (required by Next's eval-based dev runtime)", () => {
    expect(directive(buildContentSecurityPolicy(true), "script-src")).toContain("'unsafe-eval'");
  });

  it("production policy does NOT contain 'unsafe-eval' anywhere", () => {
    const prod = buildContentSecurityPolicy(false);
    expect(prod).not.toContain("unsafe-eval");
    expect(directive(prod, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
  });

  it("'unsafe-eval' is the ONLY difference between the two policies", () => {
    const dev = buildContentSecurityPolicy(true).replace(" 'unsafe-eval'", "");
    expect(dev).toBe(buildContentSecurityPolicy(false));
  });

  it.each([true, false])("keeps every other restriction intact (isDev=%s)", (isDev) => {
    const csp = buildContentSecurityPolicy(isDev);
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' https://*.supabase.co");
    expect(directive(csp, "img-src")).toBe("img-src 'self' https://gofuturegrad.com data:");
    expect(directive(csp, "style-src")).toContain("https://fonts.googleapis.com");
    expect(directive(csp, "font-src")).toContain("https://fonts.gstatic.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("never introduces a bare wildcard source in either environment", () => {
    for (const isDev of [true, false]) {
      // the only wildcard allowed is the scoped https://*.supabase.co host
      const withoutSupabase = buildContentSecurityPolicy(isDev).replace("https://*.supabase.co", "");
      expect(withoutSupabase).not.toMatch(/\s\*(\s|;|$)/);
    }
  });

  it("emits exactly one CSP header, plus the other four security headers, in both modes", () => {
    for (const isDev of [true, false]) {
      const headers = buildSecurityHeaders(isDev);
      expect(headers.filter((h) => h.key === "Content-Security-Policy")).toHaveLength(1);
      expect(headers.map((h) => h.key).sort()).toEqual(
        ["Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]
      );
    }
  });
});
