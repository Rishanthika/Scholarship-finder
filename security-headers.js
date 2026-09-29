/**
 * Security headers, defined once and used by next.config.js.
 *
 * Kept as a plain CommonJS file (not TypeScript) because next.config.js
 * cannot import TypeScript, and kept separate from next.config.js so the
 * dev and production policies can be unit-tested directly
 * (see src/lib/csp.test.ts).
 *
 * WHY THE POLICY DIFFERS BETWEEN DEV AND PRODUCTION
 * -------------------------------------------------
 * `next dev` compiles with webpack's eval-based devtool and injects the
 * react-refresh (hot reload) runtime. Every module in the dev bundle is
 * wrapped in eval(). A script-src without 'unsafe-eval' makes the browser
 * throw "EvalError: Evaluating a string as JavaScript violates the
 * following Content-Security-Policy directive" the moment main-app.js
 * loads, so React never initializes and no event handler is ever
 * attached (buttons do nothing, native form submission takes over).
 *
 * Production bundles contain no eval, so 'unsafe-eval' is added ONLY when
 * isDev is true and never appears in a production build's headers.
 */

function buildContentSecurityPolicy(isDev) {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) {
    // Development only: required by Next's dev runtime (see above).
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://gofuturegrad.com data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function buildSecurityHeaders(isDev) {
  return [
    // Stops browsers guessing content types away from what the server declares.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Limits how much of this site's URL leaks to other sites via Referer.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Clickjacking protection (also enforced by frame-ancestors in the CSP;
    // kept here for older browsers that ignore CSP frame-ancestors).
    { key: "X-Frame-Options", value: "DENY" },
    // Disables browser features this app has no use for.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isDev) },
  ];
}

module.exports = { buildContentSecurityPolicy, buildSecurityHeaders };
