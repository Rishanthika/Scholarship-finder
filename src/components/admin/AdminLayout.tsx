"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GraduationCap, Building2, ShieldCheck, Settings, ArrowLeft, LogOut } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabaseBrowserClient";
import { AdminLoadingState, AdminErrorState } from "./AdminPrimitives";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/scholarships", label: "Scholarships", icon: GraduationCap },
  { href: "/admin/universities", label: "Universities", icon: Building2 },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AuthState = "loading" | "authorized" | "unauthenticated" | "forbidden" | "error";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setAuthState("unauthenticated");
          router.replace("/admin/login");
          return;
        }
        if (res.status === 403) {
          setAuthState("forbidden");
          return;
        }
        if (!res.ok) {
          setAuthState("error");
          return;
        }
        const body = await res.json();
        setEmail(body.user?.email ?? null);
        setAuthState("authorized");
      })
      .catch(() => {
        if (!cancelled) setAuthState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (authState === "loading" || authState === "unauthenticated") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-brand-background">
        <AdminLoadingState label="Checking authorization..." />
      </div>
    );
  }

  if (authState === "forbidden") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-brand-background px-5 text-center">
        <h1 className="font-heading text-xl font-bold text-brand-ink">Access Denied</h1>
        <p className="max-w-sm text-sm text-brand-muted">
          You&rsquo;re signed in, but your account is not authorized to access the FutureGrad admin dashboard. Contact
          whoever manages the admin allowlist if you believe this is a mistake.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-brand-border/15 px-4 py-2.5 text-sm font-medium text-brand-ink"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-brand-background px-5">
        <AdminErrorState message="Unable to verify admin access right now. Please try again." />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-brand-background">
      <div className="flex min-h-[100dvh] flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-brand-border/10 bg-white px-4 py-5 lg:w-60 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div>
            <p className="font-heading text-base font-bold text-brand-ink">FutureGrad</p>
            <p className="text-xs font-medium text-brand-muted">Scholarship Admin</p>
          </div>

          <nav className="mt-6 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-brand-primary/5 text-brand-primary" : "text-brand-muted hover:bg-brand-background hover:text-brand-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-brand-border/10 pt-4 lg:mt-auto">
            {email && <p className="truncate px-3 text-xs text-brand-muted" title={email}>{email}</p>}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-background hover:text-brand-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
            <Link
              href="/"
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-background hover:text-brand-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Scholarship Finder
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
