"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingState, AdminErrorState, AdminEmptyState } from "@/components/admin/AdminPrimitives";
import { Search, Plus } from "lucide-react";
import type { University } from "@/types";

type UniversityWithCount = University & { scholarshipCount: number };

export default function AdminUniversitiesPage() {
  const [records, setRecords] = useState<UniversityWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/admin/universities?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Unable to load universities.");
        return res.json();
      })
      .then((data) => setRecords(data.records))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-brand-ink">Universities</h1>
        <Link href="/admin/universities/new" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight">
          <Plus className="h-4 w-4" aria-hidden="true" /> New University
        </Link>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search university or country..."
          className="w-full rounded-full border border-brand-border/15 py-2 pl-9 pr-3 text-sm focus:border-brand-primary focus:outline-none"
        />
      </div>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {!loading && !error && records.length === 0 && <div className="mt-6"><AdminEmptyState message="No universities match your search." /></div>}

      {!loading && !error && records.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-brand-border/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-border/10 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">QS 2026</th>
                <th className="px-4 py-3">THE 2026</th>
                <th className="px-4 py-3"># Scholarships</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((u) => (
                <tr key={u.id} className="border-b border-brand-border/8 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-ink">{u.university_name}</td>
                  <td className="px-4 py-3 text-brand-muted">{u.country}</td>
                  <td className="px-4 py-3 text-brand-muted">{u.qs_2026 ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-muted">{u.the_2026 ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-muted">{u.scholarshipCount}</td>
                  <td className="px-4 py-3 text-brand-muted">{u.updated_at ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/universities/${u.id}/edit`} className="font-medium text-brand-primary hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
