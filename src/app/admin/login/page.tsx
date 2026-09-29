"use client";

import { useState } from "react";
import Image from "next/image";
import { getBrowserSupabaseClient } from "@/lib/supabaseBrowserClient";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(signInError.message || "Unable to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }
      // A hard navigation (not router.push + router.refresh) is
      // deliberate here — see the diagnosis in this phase's report.
      // router.push() triggers a Next.js client-side (soft) navigation,
      // which fetches an RSC payload for /admin through the app
      // router's own cache/fetch path rather than a plain HTTP request.
      // Middleware runs on that request and reads the session via
      // req.cookies — but the cookie signInWithPassword() just wrote
      // (via document.cookie, since no custom cookie handlers are
      // configured) does not reliably make it into that soft
      // navigation's request in time, causing middleware to see no
      // session and redirect straight back to /admin/login — exactly
      // the observed "GET /admin/login" repeating forever, /admin never
      // appearing. A hard navigation forces a genuinely fresh HTTP
      // request, which always carries the browser's current cookies
      // exactly like a normal page load, eliminating the race entirely.
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-brand-background px-5">
      <div className="w-full max-w-sm rounded-2xl border border-brand-border/10 bg-white p-7 shadow-card">
        <div className="flex flex-col items-center text-center">
          <Image
            src="https://gofuturegrad.com/wp-content/uploads/2026/06/cropped-cropped-Futuregrad-logo-official-1.jpeg"
            alt="FutureGrad"
            width={128}
            height={48}
            className="h-9 w-auto"
            unoptimized
          />
          <p className="mt-4 font-heading text-lg font-bold text-brand-ink">Admin Portal</p>
          <p className="mt-1 text-sm text-brand-muted">Sign in to manage scholarships and universities.</p>
        </div>

        <form onSubmit={handleSubmit} method="post" className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brand-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-brand-border/15 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-brand-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-brand-border/15 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-status-error/20 bg-status-errorBg px-3.5 py-2.5 text-sm text-status-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryLight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
