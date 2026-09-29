"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingState, AdminErrorState } from "@/components/admin/AdminPrimitives";
import { ScholarshipForm, scholarshipToFormValues } from "@/components/admin/ScholarshipForm";
import { ArrowLeft } from "lucide-react";
import type { Scholarship, University } from "@/types";

export default function EditScholarshipPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<Scholarship | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/scholarships/${params.id}`).then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Unable to load scholarship.");
        return res.json();
      }),
      fetch("/api/admin/universities").then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Unable to load universities.");
        return res.json();
      }),
    ])
      .then(([scholarship, unis]) => {
        setRecord(scholarship);
        setUniversities(unis.records);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AdminLayout>
      <Link href={`/admin/scholarships/${params.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Scholarship
      </Link>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {record && (
        <>
          <h1 className="mt-4 font-heading text-2xl font-bold text-brand-ink">Edit: {record.scholarship_name}</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Last verified: {record.last_verified_date} · Updated: {record.updated_at ?? "—"}
          </p>
          <div className="mt-5">
            <ScholarshipForm
              mode="edit"
              scholarshipId={record.id}
              initialValues={scholarshipToFormValues(record)}
              existingStatus={record.verification_status}
              universities={universities}
            />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
