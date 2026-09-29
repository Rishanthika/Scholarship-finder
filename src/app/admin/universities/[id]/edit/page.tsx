"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingState, AdminErrorState } from "@/components/admin/AdminPrimitives";
import { UniversityForm, universityToFormValues } from "@/components/admin/UniversityForm";
import { ArrowLeft } from "lucide-react";
import type { University, Scholarship } from "@/types";

export default function EditUniversityPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<(University & { relatedScholarships?: Scholarship[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/universities/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Unable to load university.");
        return res.json();
      })
      .then(setRecord)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AdminLayout>
      <Link href="/admin/universities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Universities
      </Link>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {record && (
        <>
          <h1 className="mt-4 font-heading text-2xl font-bold text-brand-ink">Edit: {record.university_name}</h1>
          <div className="mt-5">
            <UniversityForm mode="edit" universityId={record.id} initialValues={universityToFormValues(record)} />
          </div>

          {record.relatedScholarships && record.relatedScholarships.length > 0 && (
            <div className="mt-6 rounded-2xl border border-brand-border/10 bg-white p-5">
              <h2 className="font-heading text-sm font-bold text-brand-ink">Related Scholarships ({record.relatedScholarships.length})</h2>
              <ul className="mt-3 space-y-2">
                {record.relatedScholarships.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/scholarships/${s.id}`} className="text-sm font-medium text-brand-primary hover:underline">
                      {s.scholarship_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
