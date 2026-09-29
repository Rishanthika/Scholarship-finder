"use client";

import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { UniversityForm, universityToFormValues } from "@/components/admin/UniversityForm";
import { ArrowLeft } from "lucide-react";

export default function NewUniversityPage() {
  return (
    <AdminLayout>
      <Link href="/admin/universities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Universities
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-ink">New University</h1>
      <div className="mt-5">
        <UniversityForm mode="create" initialValues={universityToFormValues()} />
      </div>
    </AdminLayout>
  );
}
