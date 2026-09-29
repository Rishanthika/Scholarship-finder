"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard, AdminLoadingState, AdminErrorState, AdminEmptyState, StatusBadge } from "@/components/admin/AdminPrimitives";
import { formatDeadlineShort } from "@/lib/formatting";
import type { Scholarship } from "@/types";

interface DashboardStats {
  total: number;
  green: number;
  amber: number;
  red: number;
  universityCount: number;
  upcomingDeadlines: Scholarship[];
  recentlyUpdated: Scholarship[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Unable to load dashboard statistics.");
        }
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold text-brand-ink">Scholarship Database</h1>
      <p className="mt-1 text-sm text-brand-muted">Manage, verify and maintain FutureGrad&rsquo;s scholarship opportunities.</p>

      {loading && <div className="mt-6"><AdminLoadingState label="Loading dashboard..." /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Scholarships" value={stats.total} />
            <StatCard label="Green" value={stats.green} accent="text-status-success" />
            <StatCard label="Amber" value={stats.amber} accent="text-status-warning" />
            <StatCard label="Red" value={stats.red} accent="text-status-error" />
            <StatCard label="Universities" value={stats.universityCount} />
          </div>

          <div className="mt-4 rounded-2xl border border-status-warning/20 bg-status-warningBg p-4 text-sm text-status-warning">
            <span className="font-semibold">Needs attention:</span> {stats.amber} AMBER scholarship{stats.amber === 1 ? "" : "s"} require
            verification.{" "}
            <Link href="/admin/verification" className="underline">
              Review now
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
              <h2 className="font-heading text-sm font-bold text-brand-ink">Upcoming Deadlines</h2>
              {stats.upcomingDeadlines.length === 0 ? (
                <div className="mt-3"><AdminEmptyState message="No confirmed upcoming deadlines." /></div>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {stats.upcomingDeadlines.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <Link href={`/admin/scholarships/${s.id}`} className="truncate font-medium text-brand-ink hover:underline">
                        {s.scholarship_name}
                      </Link>
                      <span className="ml-3 shrink-0 text-xs text-brand-muted">{formatDeadlineShort(s)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
              <h2 className="font-heading text-sm font-bold text-brand-ink">Recently Updated</h2>
              {stats.recentlyUpdated.length === 0 ? (
                <div className="mt-3"><AdminEmptyState message="No records yet." /></div>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {stats.recentlyUpdated.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <Link href={`/admin/scholarships/${s.id}`} className="truncate font-medium text-brand-ink hover:underline">
                        {s.scholarship_name}
                      </Link>
                      <StatusBadge status={s.verification_status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
