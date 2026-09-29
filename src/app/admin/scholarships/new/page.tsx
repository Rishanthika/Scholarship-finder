"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingState, AdminErrorState } from "@/components/admin/AdminPrimitives";
import { ScholarshipForm, scholarshipToFormValues } from "@/components/admin/ScholarshipForm";
import { ArrowLeft } from "lucide-react";
import type { University } from "@/types";

export default function NewScholarshipPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/universities")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Unable to load universities.");
        }
        return res.json();
      })
      .then((data) => setUniversities(data.records))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <Link href="/admin/scholarships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Scholarships
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-ink">New Scholarship</h1>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {!loading && !error && (
        <div className="mt-5">
          <ScholarshipForm mode="create" initialValues={scholarshipToFormValues()} universities={universities} />
        </div>
      )}
    </AdminLayout>
  );
}
