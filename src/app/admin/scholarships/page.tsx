"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge, AdminLoadingState, AdminErrorState, AdminEmptyState } from "@/components/admin/AdminPrimitives";
import { formatDeadlineShort } from "@/lib/formatting";
import { Search, Plus, Archive } from "lucide-react";
import type { Scholarship } from "@/types";

type SortOption = "updated_desc" | "updated_asc" | "deadline" | "name" | "university" | "status";

export default function AdminScholarshipsPage() {
  const [records, setRecords] = useState<Scholarship[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [fundingType, setFundingType] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [sort, setSort] = useState<SortOption>("updated_desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (country) params.set("country", country);
    if (degreeLevel) params.set("degreeLevel", degreeLevel);
    if (fundingType) params.set("fundingType", fundingType);
    if (verificationStatus) params.set("verificationStatus", verificationStatus);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    fetch(`/api/admin/scholarships?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Unable to load scholarship records.");
        }
        return res.json();
      })
      .then((data) => {
        setRecords(data.records);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, country, degreeLevel, fundingType, verificationStatus, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const countries = useMemo(() => Array.from(new Set(records.map((r) => r.country))).sort(), [records]);

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this scholarship? It will be hidden from students and this list, but not permanently deleted.")) return;
    const res = await fetch(`/api/admin/scholarships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) load();
    else alert("Unable to archive scholarship. Please try again.");
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-ink">Scholarships</h1>
          <p className="mt-1 text-sm text-brand-muted">{total} record{total === 1 ? "" : "s"}</p>
        </div>
        <Link
          href="/admin/scholarships/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Scholarship
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search name, university, country..."
            className="rounded-full border border-brand-border/15 py-2 pl-9 pr-3 text-sm focus:border-brand-primary focus:outline-none"
          />
        </div>

        <select
          value={country}
          onChange={(e) => { setPage(1); setCountry(e.target.value); }}
          className="rounded-full border border-brand-border/15 px-3 py-2 text-xs font-medium"
        >
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={degreeLevel}
          onChange={(e) => { setPage(1); setDegreeLevel(e.target.value); }}
          className="rounded-full border border-brand-border/15 px-3 py-2 text-xs font-medium"
        >
          <option value="">Degree Level</option>
          {["undergraduate", "masters", "phd", "postdoctoral", "research", "multiple"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={fundingType}
          onChange={(e) => { setPage(1); setFundingType(e.target.value); }}
          className="rounded-full border border-brand-border/15 px-3 py-2 text-xs font-medium"
        >
          <option value="">Funding Type</option>
          {["fully_funded", "full_tuition", "partial_tuition", "tuition_waiver", "stipend", "merit", "need_based", "research_funding", "mixed"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          value={verificationStatus}
          onChange={(e) => { setPage(1); setVerificationStatus(e.target.value); }}
          className="rounded-full border border-brand-border/15 px-3 py-2 text-xs font-medium"
        >
          <option value="">All Statuses</option>
          <option value="GREEN">GREEN</option>
          <option value="AMBER">AMBER</option>
          <option value="RED">RED</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-full border border-brand-border/15 px-3 py-2 text-xs font-medium"
        >
          <option value="updated_desc">Newest Updated</option>
          <option value="updated_asc">Oldest Updated</option>
          <option value="deadline">Deadline</option>
          <option value="name">Scholarship Name</option>
          <option value="university">University</option>
          <option value="status">Verification Status</option>
        </select>
      </div>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {!loading && !error && records.length === 0 && (
        <div className="mt-6"><AdminEmptyState message="No scholarships match your current filters." /></div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-brand-border/10 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-brand-border/10 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-4 py-3">Scholarship</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Degree Level</th>
                <th className="px-4 py-3">Funding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Last Verified</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((s) => (
                <tr key={s.id} className="border-b border-brand-border/8 last:border-0">
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-brand-ink">{s.scholarship_name}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.university_id ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.country}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.degree_level.join(", ")}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.funding_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.verification_status} /></td>
                  <td className="px-4 py-3 text-brand-muted">{formatDeadlineShort(s)}</td>
                  <td className="px-4 py-3 text-brand-muted">{s.last_verified_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/scholarships/${s.id}`} className="font-medium text-brand-primary hover:underline">
                        View
                      </Link>
                      <Link href={`/admin/scholarships/${s.id}/edit`} className="font-medium text-brand-primary hover:underline">
                        Edit
                      </Link>
                      <button type="button" onClick={() => handleArchive(s.id)} className="text-brand-muted hover:text-status-error" title="Archive">
                        <Archive className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-brand-muted">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">
            ← Previous
          </button>
          <span>Page {page} of {Math.ceil(total / pageSize)}</span>
          <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
