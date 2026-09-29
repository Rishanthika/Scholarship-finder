"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge, AdminLoadingState, AdminErrorState } from "@/components/admin/AdminPrimitives";
import { formatDeadlineDetail } from "@/lib/formatting";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Scholarship } from "@/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">{title}</h2>
      <div className="space-y-1.5 text-sm text-brand-ink">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="font-medium">{label}:</span> <span className="text-brand-muted">{value ?? "Not specified"}</span>
    </p>
  );
}

export default function AdminScholarshipDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<Scholarship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/scholarships/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Unable to load scholarship record.");
        }
        return res.json();
      })
      .then(setRecord)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AdminLayout>
      <Link href="/admin/scholarships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Scholarships
      </Link>

      {loading && <div className="mt-6"><AdminLoadingState /></div>}
      {error && <div className="mt-6"><AdminErrorState message={error} /></div>}

      {record && (
        <>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-xl font-bold text-brand-ink">{record.scholarship_name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={record.verification_status} />
                {record.archived_at && (
                  <span className="rounded-md bg-brand-border/10 px-2 py-1 text-xs font-semibold text-brand-muted">Archived</span>
                )}
              </div>
            </div>
            <Link
              href={`/admin/scholarships/${record.id}/edit`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </Link>
          </div>

          {record.verification_status === "RED" && (
            <div className="mt-4 rounded-xl border border-status-error/20 bg-status-errorBg px-4 py-3 text-sm text-status-error">
              <span className="font-semibold">RED records are excluded from student-facing recommendations.</span> This record is retained
              for audit purposes only.
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Basic Information">
              <Row label="Scholarship Name" value={record.scholarship_name} />
              <Row label="Provider" value={record.provider} />
              <Row label="University" value={record.university_id} />
              <Row label="Country" value={record.country} />
              <Row label="Official Scholarship URL" value={record.official_scholarship_url && <a className="text-brand-primary underline" href={record.official_scholarship_url} target="_blank" rel="noopener noreferrer">{record.official_scholarship_url}</a>} />
              <Row label="Official University URL" value={record.official_university_url && <a className="text-brand-primary underline" href={record.official_university_url} target="_blank" rel="noopener noreferrer">{record.official_university_url}</a>} />
            </Section>

            <Section title="Eligibility">
              <Row label="Degree Level" value={record.degree_level.join(", ")} />
              <Row label="Field / Discipline" value={record.academic_fields === "all" ? "All fields" : record.academic_fields.join(", ")} />
              <Row label="Excluded Fields" value={record.excluded_academic_fields.length > 0 ? record.excluded_academic_fields.join(", ") : null} />
              <Row label="Engineering Domain" value={record.engineering_domains === null ? "N/A" : record.engineering_domains === "all" ? "All domains" : record.engineering_domains.join(", ")} />
              <Row label="Nationality Eligibility" value={record.nationality_eligibility} />
              <Row label="Excluded Nationalities" value={record.excluded_nationalities.length > 0 ? record.excluded_nationalities.join(", ") : null} />
              <Row label="Minimum GPA" value={record.minimum_gpa} />
              <Row label="Minimum Percentage" value={record.minimum_percentage} />
              <Row label="English Requirement" value={record.english_requirement} />
              <Row label="Standardized Test" value={record.standardized_test_requirement} />
              <Row label="Work Experience Required (years)" value={record.work_experience_required_years} />
              <Row label="Work Experience Preferred" value={record.work_experience_preferred ? "Yes" : "No"} />
              <Row label="Research Experience Required" value={record.research_experience_required ? "Yes" : "No"} />
            </Section>

            <Section title="Funding">
              <Row label="Funding Type" value={record.funding_type} />
              <Row label="Tuition Coverage" value={record.tuition_coverage} />
              <Row label="Living Support" value={record.living_support} />
              <Row label="Other Benefits" value={record.other_benefits} />
            </Section>

            <Section title="Application">
              <Row label="Application Opening Date" value={record.application_opening_date} />
              <Row label="Deadline" value={formatDeadlineDetail(record)} />
              <Row label="Intake" value={record.intake} />
            </Section>

            <Section title="Verification">
              <Row label="Verification Status" value={<StatusBadge status={record.verification_status} />} />
              <Row label="Last Verified Date" value={record.last_verified_date} />
              <Row label="Verification Notes" value={record.verification_notes} />
            </Section>

            <Section title="Ranking">
              <Row label="QS 2026" value={record.qs_2026} />
              <Row label="THE 2026" value={record.the_2026} />
            </Section>

            <Section title="Internal Metadata">
              <Row label="Scholarship ID" value={record.id} />
              <Row label="University ID" value={record.university_id} />
              <Row label="Created At" value={record.created_at} />
              <Row label="Updated At" value={record.updated_at} />
            </Section>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
