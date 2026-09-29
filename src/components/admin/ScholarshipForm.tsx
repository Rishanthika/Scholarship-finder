"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/admin/AdminPrimitives";
import type { Scholarship, DegreeLevel, VerificationStatus, FundingType, University } from "@/types";

const DEGREE_LEVELS: DegreeLevel[] = ["undergraduate", "masters", "phd", "postdoctoral", "research", "multiple"];
const FUNDING_TYPES: FundingType[] = [
  "fully_funded", "full_tuition", "partial_tuition", "tuition_waiver",
  "stipend", "merit", "need_based", "research_funding", "mixed",
];
const VERIFICATION_STATUSES: VerificationStatus[] = ["GREEN", "AMBER", "RED"];

export interface ScholarshipFormValues {
  scholarship_name: string;
  provider: string;
  university_id: string;
  country: string;
  degree_level: DegreeLevel[];
  verification_status: VerificationStatus;
  official_scholarship_url: string;
  official_university_url: string;
  minimum_gpa: string;
  minimum_percentage: string;
  english_requirement: string;
  standardized_test_requirement: string;
  work_experience_required_years: string;
  funding_type: FundingType;
  tuition_coverage: string;
  living_support: string;
  other_benefits: string;
  application_opening_date: string;
  deadline: string;
  intake: string;
  verification_notes: string;
  last_verified_date: string;
  qs_2026: string;
  the_2026: string;
  student_facing_description: string;
}

export function scholarshipToFormValues(s?: Scholarship): ScholarshipFormValues {
  return {
    scholarship_name: s?.scholarship_name ?? "",
    provider: s?.provider ?? "",
    university_id: s?.university_id ?? "",
    country: s?.country ?? "",
    degree_level: s?.degree_level ?? [],
    verification_status: s?.verification_status ?? "AMBER",
    official_scholarship_url: s?.official_scholarship_url ?? "",
    official_university_url: s?.official_university_url ?? "",
    minimum_gpa: s?.minimum_gpa?.toString() ?? "",
    minimum_percentage: s?.minimum_percentage?.toString() ?? "",
    english_requirement: s?.english_requirement ?? "",
    standardized_test_requirement: s?.standardized_test_requirement ?? "",
    work_experience_required_years: s?.work_experience_required_years?.toString() ?? "",
    funding_type: s?.funding_type ?? "partial_tuition",
    tuition_coverage: s?.tuition_coverage ?? "",
    living_support: s?.living_support ?? "",
    other_benefits: s?.other_benefits ?? "",
    application_opening_date: s?.application_opening_date ?? "",
    deadline: s?.deadline ?? "",
    intake: s?.intake ?? "",
    verification_notes: s?.verification_notes ?? "",
    last_verified_date: s?.last_verified_date ?? "",
    qs_2026: s?.qs_2026?.toString() ?? "",
    the_2026: s?.the_2026?.toString() ?? "",
    student_facing_description: s?.student_facing_description ?? "",
  };
}

function toApiPayload(v: ScholarshipFormValues) {
  return {
    scholarship_name: v.scholarship_name,
    provider: v.provider,
    university_id: v.university_id || null,
    country: v.country,
    degree_level: v.degree_level,
    verification_status: v.verification_status,
    official_scholarship_url: v.official_scholarship_url || null,
    official_university_url: v.official_university_url || null,
    minimum_gpa: v.minimum_gpa ? Number(v.minimum_gpa) : null,
    minimum_percentage: v.minimum_percentage ? Number(v.minimum_percentage) : null,
    english_requirement: v.english_requirement || null,
    standardized_test_requirement: v.standardized_test_requirement || null,
    work_experience_required_years: v.work_experience_required_years ? Number(v.work_experience_required_years) : null,
    funding_type: v.funding_type,
    tuition_coverage: v.tuition_coverage || null,
    living_support: v.living_support || null,
    other_benefits: v.other_benefits || null,
    application_opening_date: v.application_opening_date || null,
    deadline: v.deadline || null,
    deadline_confirmed: Boolean(v.deadline),
    intake: v.intake || null,
    verification_notes: v.verification_notes || null,
    last_verified_date: v.last_verified_date || new Date().toISOString().slice(0, 10),
    qs_2026: v.qs_2026 ? Number(v.qs_2026) : null,
    the_2026: v.the_2026 ? Number(v.the_2026) : null,
    student_facing_description: v.student_facing_description,
  };
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-brand-ink">
        {label} {required && <span className="text-status-error">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-brand-border/15 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

interface ScholarshipFormProps {
  mode: "create" | "edit";
  scholarshipId?: string;
  initialValues: ScholarshipFormValues;
  existingStatus?: VerificationStatus;
  universities: University[];
}

export function ScholarshipForm({ mode, scholarshipId, initialValues, existingStatus, universities }: ScholarshipFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ScholarshipFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<VerificationStatus | null>(null);

  const set = <K extends keyof ScholarshipFormValues>(key: K, value: ScholarshipFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (confirmed = false) => {
    setSaving(true);
    setServerError(null);
    setFieldErrors({});

    const payload: Record<string, unknown> = { ...toApiPayload(values) };
    if (confirmed) payload.statusChangeConfirmed = true;

    const url = mode === "create" ? "/api/admin/scholarships" : `/api/admin/scholarships/${scholarshipId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (body.fieldErrors?.statusChange && !confirmed) {
        // Server confirms a real transition is happening — show the modal.
        setPendingStatusChange(values.verification_status);
        setSaving(false);
        return;
      }
      setFieldErrors(body.fieldErrors ?? {});
      setServerError(body.error ?? "Unable to save scholarship. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(mode === "create" ? `/admin/scholarships/${body.id}` : `/admin/scholarships/${scholarshipId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isRealStatusChange = mode === "edit" && existingStatus && existingStatus !== values.verification_status;
    if (isRealStatusChange) {
      setPendingStatusChange(values.verification_status);
      return;
    }
    submit(false);
  };

  const confirmMessage =
    pendingStatusChange === "GREEN"
      ? "GREEN status means this scholarship has been verified against an authoritative source. Continue?"
      : pendingStatusChange === "RED"
        ? "RED records are excluded from student recommendations because they failed verification or eligibility checks. Only change this status after re-verifying the official source."
        : `Change verification status from ${existingStatus} to ${pendingStatusChange}?`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && <div className="rounded-xl border border-status-error/20 bg-status-errorBg px-4 py-3 text-sm text-status-error">{serverError}</div>}

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Basic Information</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Scholarship Name" required>
            <input className={inputClass} value={values.scholarship_name} onChange={(e) => set("scholarship_name", e.target.value)} />
            {fieldErrors.scholarship_name && <p className="mt-1 text-xs text-status-error">{fieldErrors.scholarship_name}</p>}
          </Field>
          <Field label="Provider">
            <input className={inputClass} value={values.provider} onChange={(e) => set("provider", e.target.value)} />
          </Field>
          <Field label="University">
            <select className={inputClass} value={values.university_id} onChange={(e) => set("university_id", e.target.value)}>
              <option value="">— Government / no specific university —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.university_name}</option>
              ))}
            </select>
            {fieldErrors.university_id && <p className="mt-1 text-xs text-status-error">{fieldErrors.university_id}</p>}
          </Field>
          <Field label="Country" required>
            <input className={inputClass} value={values.country} onChange={(e) => set("country", e.target.value)} />
            {fieldErrors.country && <p className="mt-1 text-xs text-status-error">{fieldErrors.country}</p>}
          </Field>
          <Field label="Official Scholarship URL">
            <input className={inputClass} value={values.official_scholarship_url} onChange={(e) => set("official_scholarship_url", e.target.value)} placeholder="https://..." />
            {fieldErrors.official_scholarship_url && <p className="mt-1 text-xs text-status-error">{fieldErrors.official_scholarship_url}</p>}
          </Field>
          <Field label="Official University URL">
            <input className={inputClass} value={values.official_university_url} onChange={(e) => set("official_university_url", e.target.value)} placeholder="https://..." />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Eligibility</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Degree Level" required>
            <div className="flex flex-wrap gap-2">
              {DEGREE_LEVELS.map((d) => (
                <label key={d} className="flex items-center gap-1.5 rounded-lg border border-brand-border/15 px-2.5 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={values.degree_level.includes(d)}
                    onChange={(e) =>
                      set("degree_level", e.target.checked ? [...values.degree_level, d] : values.degree_level.filter((x) => x !== d))
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
            {fieldErrors.degree_level && <p className="mt-1 text-xs text-status-error">{fieldErrors.degree_level}</p>}
          </Field>
          <Field label="English Requirement">
            <input className={inputClass} value={values.english_requirement} onChange={(e) => set("english_requirement", e.target.value)} placeholder="e.g. IELTS 6.5, or leave blank if unpublished" />
          </Field>
          <Field label="Minimum GPA">
            <input type="number" step="0.1" className={inputClass} value={values.minimum_gpa} onChange={(e) => set("minimum_gpa", e.target.value)} />
          </Field>
          <Field label="Minimum Percentage">
            <input type="number" step="1" className={inputClass} value={values.minimum_percentage} onChange={(e) => set("minimum_percentage", e.target.value)} />
          </Field>
          <Field label="Standardized Test Requirement">
            <input className={inputClass} value={values.standardized_test_requirement} onChange={(e) => set("standardized_test_requirement", e.target.value)} />
          </Field>
          <Field label="Work Experience Required (years)">
            <input type="number" step="1" className={inputClass} value={values.work_experience_required_years} onChange={(e) => set("work_experience_required_years", e.target.value)} placeholder="Leave blank if not mandatory" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Funding</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Funding Type" required>
            <select className={inputClass} value={values.funding_type} onChange={(e) => set("funding_type", e.target.value as FundingType)}>
              {FUNDING_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Tuition Coverage">
            <input className={inputClass} value={values.tuition_coverage} onChange={(e) => set("tuition_coverage", e.target.value)} placeholder="e.g. 100%, £5,000, or leave blank" />
            {fieldErrors.tuition_coverage && <p className="mt-1 text-xs text-status-error">{fieldErrors.tuition_coverage}</p>}
          </Field>
          <Field label="Living Support">
            <input className={inputClass} value={values.living_support} onChange={(e) => set("living_support", e.target.value)} />
          </Field>
          <Field label="Other Benefits">
            <input className={inputClass} value={values.other_benefits} onChange={(e) => set("other_benefits", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Application</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Application Opening Date">
            <input className={inputClass} value={values.application_opening_date} onChange={(e) => set("application_opening_date", e.target.value)} placeholder="Free text, e.g. '1 June' or an exact date" />
          </Field>
          <Field label="Deadline">
            <input type="date" className={inputClass} value={values.deadline} onChange={(e) => set("deadline", e.target.value)} />
            {fieldErrors.deadline && <p className="mt-1 text-xs text-status-error">{fieldErrors.deadline}</p>}
          </Field>
          <Field label="Intake">
            <input className={inputClass} value={values.intake} onChange={(e) => set("intake", e.target.value)} placeholder="e.g. 2027-28" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Verification</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Verification Status" required>
            <select className={inputClass} value={values.verification_status} onChange={(e) => set("verification_status", e.target.value as VerificationStatus)}>
              {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {fieldErrors.verification_status && <p className="mt-1 text-xs text-status-error">{fieldErrors.verification_status}</p>}
            {mode === "create" && <p className="mt-1 text-xs text-brand-muted">New scholarships default to AMBER — GREEN must be explicitly chosen and confirmed.</p>}
          </Field>
          <Field label="Last Verified Date">
            <input className={inputClass} value={values.last_verified_date} onChange={(e) => set("last_verified_date", e.target.value)} placeholder="e.g. 2026-09-04" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Verification Notes">
              <textarea className={inputClass} rows={3} value={values.verification_notes} onChange={(e) => set("verification_notes", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Student-Facing Description">
              <textarea className={inputClass} rows={2} value={values.student_facing_description} onChange={(e) => set("student_facing_description", e.target.value)} />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">Ranking</legend>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="QS 2026 Rank">
            <input type="number" className={inputClass} value={values.qs_2026} onChange={(e) => set("qs_2026", e.target.value)} />
          </Field>
          <Field label="THE 2026 Rank">
            <input type="number" className={inputClass} value={values.the_2026} onChange={(e) => set("the_2026", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-brand-border/15 px-5 py-2.5 text-sm font-medium text-brand-ink">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight disabled:opacity-50">
          {saving ? "Saving..." : mode === "create" ? "Create Scholarship" : "Save Changes"}
        </button>
      </div>

      <ConfirmModal
        open={pendingStatusChange !== null}
        title={pendingStatusChange === "GREEN" ? "Confirm GREEN status" : pendingStatusChange === "RED" ? "Confirm RED status" : "Confirm status change"}
        message={confirmMessage}
        danger={pendingStatusChange === "RED"}
        confirmLabel="Yes, continue"
        onConfirm={() => {
          setPendingStatusChange(null);
          submit(true);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
    </form>
  );
}
