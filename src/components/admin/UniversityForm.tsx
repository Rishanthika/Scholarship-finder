"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { University } from "@/types";

export interface UniversityFormValues {
  university_name: string;
  country: string;
  city: string;
  official_url: string;
  qs_2026: string;
  the_2026: string;
  partner_status: "" | "FutureGrad Partner" | "Informational Only";
  last_verified_date: string;
}

export function universityToFormValues(u?: University): UniversityFormValues {
  return {
    university_name: u?.university_name ?? "",
    country: u?.country ?? "",
    city: u?.city ?? "",
    official_url: u?.official_url ?? "",
    qs_2026: u?.qs_2026?.toString() ?? "",
    the_2026: u?.the_2026?.toString() ?? "",
    partner_status: u?.partner_status ?? "",
    last_verified_date: u?.last_verified_date ?? "",
  };
}

const inputClass = "w-full rounded-xl border border-brand-border/15 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

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

interface UniversityFormProps {
  mode: "create" | "edit";
  universityId?: string;
  initialValues: UniversityFormValues;
}

export function UniversityForm({ mode, universityId, initialValues }: UniversityFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<UniversityFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof UniversityFormValues>(key: K, value: UniversityFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setServerError(null);
    setFieldErrors({});

    const payload = {
      university_name: values.university_name,
      country: values.country,
      city: values.city || null,
      official_url: values.official_url || null,
      qs_2026: values.qs_2026 ? Number(values.qs_2026) : null,
      the_2026: values.the_2026 ? Number(values.the_2026) : null,
      partner_status: values.partner_status || null,
      last_verified_date: values.last_verified_date || new Date().toISOString().slice(0, 10),
    };

    const url = mode === "create" ? "/api/admin/universities" : `/api/admin/universities/${universityId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFieldErrors(body.fieldErrors ?? {});
      setServerError(body.error ?? "Unable to save university. Please try again.");
      setSaving(false);
      return;
    }

    router.push("/admin/universities");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && <div className="rounded-xl border border-status-error/20 bg-status-errorBg px-4 py-3 text-sm text-status-error">{serverError}</div>}

      <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="University Name" required>
            <input className={inputClass} value={values.university_name} onChange={(e) => set("university_name", e.target.value)} />
            {fieldErrors.university_name && <p className="mt-1 text-xs text-status-error">{fieldErrors.university_name}</p>}
          </Field>
          <Field label="Country" required>
            <input className={inputClass} value={values.country} onChange={(e) => set("country", e.target.value)} />
            {fieldErrors.country && <p className="mt-1 text-xs text-status-error">{fieldErrors.country}</p>}
          </Field>
          <Field label="City">
            <input className={inputClass} value={values.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Official URL">
            <input className={inputClass} value={values.official_url} onChange={(e) => set("official_url", e.target.value)} placeholder="https://..." />
            {fieldErrors.official_url && <p className="mt-1 text-xs text-status-error">{fieldErrors.official_url}</p>}
          </Field>
          <Field label="QS 2026 Rank">
            <input type="number" className={inputClass} value={values.qs_2026} onChange={(e) => set("qs_2026", e.target.value)} />
          </Field>
          <Field label="THE 2026 Rank">
            <input type="number" className={inputClass} value={values.the_2026} onChange={(e) => set("the_2026", e.target.value)} />
          </Field>
          <Field label="Partner Status">
            <select className={inputClass} value={values.partner_status} onChange={(e) => set("partner_status", e.target.value as UniversityFormValues["partner_status"])}>
              <option value="">Not specified</option>
              <option value="FutureGrad Partner">FutureGrad Partner</option>
              <option value="Informational Only">Informational Only</option>
            </select>
          </Field>
          <Field label="Last Verified Date">
            <input className={inputClass} value={values.last_verified_date} onChange={(e) => set("last_verified_date", e.target.value)} placeholder="e.g. 2026-09-04" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-brand-border/15 px-5 py-2.5 text-sm font-medium text-brand-ink">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primaryLight disabled:opacity-50">
          {saving ? "Saving..." : mode === "create" ? "Create University" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
