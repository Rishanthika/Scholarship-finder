import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    // Next.js compiles JSX with the "automatic" runtime (via SWC), which
    // is why component files import `useState` etc. from "react"
    // without ever writing `import React from "react"` themselves — the
    // transform injects the necessary jsx-runtime import automatically.
    // Vitest's own esbuild-based transform defaults to the "classic"
    // runtime unless told otherwise, which throws "React is not
    // defined" on every component file tested directly — not a real
    // bug in those files, just a mismatch with how the app is actually
    // compiled.
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" unconditionally throws unless it detects Next.js's
      // bundler context (which distinguishes server/client bundles at
      // build time) — outside that, as in a plain Vitest/Node run, it
      // always throws. This alias swaps it for a no-op so files that
      // import "server-only" (adminData.ts, adminAuth.ts, supabase.ts,
      // supabaseClient.ts) can still be unit-tested directly. This does
      // NOT weaken the real protection: Next.js's own build still uses
      // the real "server-only" package (this alias only applies inside
      // Vitest), so a client component accidentally importing one of
      // these files still fails the production build exactly as before.
      "server-only": path.resolve(__dirname, "./src/lib/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
