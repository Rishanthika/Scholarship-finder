"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingState, AdminErrorState, AdminEmptyState, ConfirmModal, StatusBadge } from "@/components/admin/AdminPrimitives";
import type { Scholarship, VerificationStatus } from "@/types";

function RecordRow({ s, onStatusChange }: { s: Scholarship; onStatusChange: (id: string, status: VerificationStatus) => void }) {
  const [pending, setPending] = useState<VerificationStatus | null>(null);

  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/scholarships/${s.id}`} className="font-heading text-sm font-bold text-brand-ink hover:underline">
            {s.scholarship_name}
          </Link>
          <p className="mt-0.5 text-xs text-brand-muted">{s.university_id ?? "Government scholarship"} · {s.country}</p>
        </div>
        <StatusBadge status={s.verification_status} />
      </div>

      {s.verification_notes && <p className="mt-3 text-sm text-brand-muted"><span className="font-medium text-brand-ink">Reason:</span> {s.verification_notes}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {s.official_scholarship_url && (
          <a href={s.official_scholarship_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-primary underline">
            Official URL
          </a>
        )}
        <span className="text-brand-muted">Last verified: {s.last_verified_date}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/scholarships/${s.id}`} className="rounded-lg border border-brand-border/15 px-3 py-1.5 text-xs font-medium text-brand-ink">
          Review
        </Link>
        <Link href={`/admin/scholarships/${s.id}/edit`} className="rounded-lg border border-brand-border/15 px-3 py-1.5 text-xs font-medium text-brand-ink">
          Edit
        </Link>
        {s.verification_status !== "GREEN" && (
          <button type="button" onClick={() => setPending("GREEN")} className="rounded-lg bg-status-successBg px-3 py-1.5 text-xs font-semibold text-status-success">
            Mark GREEN
          </button>
        )}
        {s.verification_status !== "AMBER" && (
          <button type="button" onClick={() => setPending("AMBER")} className="rounded-lg bg-status-warningBg px-3 py-1.5 text-xs font-semibold text-status-warning">
            Mark AMBER
          </button>
        )}
        {s.verification_status !== "RED" && (
          <button type="button" onClick={() => setPending("RED")} className="rounded-lg bg-status-errorBg px-3 py-1.5 text-xs font-semibold text-status-error">
            Mark RED
          </button>
        )}
      </div>

      <ConfirmModal
        open={pending !== null}
        title={pending === "GREEN" ? "Confirm GREEN status" : pending === "RED" ? "Confirm RED status" : "Confirm status change"}
        message={
          pending === "GREEN"
            ? "Are you sure this scholarship has been verified against an authoritative source and is safe to present as verified to students?"
            : pending === "RED"
              ? "RED records are excluded from student recommendations because they failed verification or eligibility checks. Only change this status after re-verifying the official source."
              : `Change status from ${s.verification_status} to ${pending}?`
        }
        danger={pending === "RED"}
        confirmLabel="Yes, continue"
        onConfirm={() => {
          if (pending) onStatusChange(s.id, pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

export default function VerificationPage() {
  const [records, setRecords] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/scholarships?pageSize=200&sort=status")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Unable to load records.");
        return res.json();
      })
      .then((data) => setRecords(data.records))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: VerificationStatus) => {
    const res = await fetch(`/api/admin/scholarships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification_status: status, statusChangeConfirmed: true }),
    });
    if (res.ok) load();
    else alert("Unable to update status. Please try again.");
  };

  const amber = records.filter((r) => r.verification_status === "AMBER");
  const red = records.filter((r) => r.verification_status === "RED");
  const recentlyVerified = [...records]
    .filter((r) => r.verification_status === "GREEN")
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 5);

  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold text-brand-ink">Verification</h1>
      <p className="mt-1 text-sm text-brand-muted">Records that require staff attention before (or after) being shown to students.</p>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {!loading && !error && (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="font-heading text-lg font-bold text-status-warning">AMBER Records — Needs Verification ({amber.length})</h2>
            <div className="mt-3 space-y-3">
              {amber.length === 0 ? <AdminEmptyState message="No AMBER records." /> : amber.map((s) => <RecordRow key={s.id} s={s} onStatusChange={handleStatusChange} />)}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-status-error">RED Records ({red.length})</h2>
            <p className="mt-1 text-xs text-brand-muted">RED records are excluded from student-facing recommendations. Retained here for audit purposes only.</p>
            <div className="mt-3 space-y-3">
              {red.length === 0 ? <AdminEmptyState message="No RED records." /> : red.map((s) => <RecordRow key={s.id} s={s} onStatusChange={handleStatusChange} />)}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-bold text-brand-ink">Recently Verified (GREEN)</h2>
            <div className="mt-3 space-y-3">
              {recentlyVerified.length === 0 ? <AdminEmptyState message="No recently verified records." /> : recentlyVerified.map((s) => <RecordRow key={s.id} s={s} onStatusChange={handleStatusChange} />)}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
