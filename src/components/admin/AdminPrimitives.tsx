"use client";

import type { VerificationStatus } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// StatusBadge — text label always present, never color-only (per the
// brief's explicit accessibility requirement for GREEN/AMBER/RED).
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<VerificationStatus, string> = {
  GREEN: "bg-status-successBg text-status-success",
  AMBER: "bg-status-warningBg text-status-warning",
  RED: "bg-status-errorBg text-status-error",
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatCard — dashboard summary card
// ---------------------------------------------------------------------------

export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-brand-border/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-bold ${accent ?? "text-brand-ink"}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmModal — used for every verification-status transition, per the
// admin brief's explicit "Audit / Data Safety" requirement.
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-floating">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? "text-status-error" : "text-status-warning"}`} aria-hidden="true" />
          <div>
            <h2 className="font-heading text-base font-bold text-brand-ink">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-brand-border/15 px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-background"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? "bg-status-error hover:opacity-90" : "bg-brand-primary hover:bg-brand-primaryLight"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty / success states — every admin page needs these
// per the brief.
// ---------------------------------------------------------------------------

export function AdminLoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-brand-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-errorBg px-4 py-3 text-sm text-status-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-brand-border/15 py-10 text-center text-sm text-brand-muted">{message}</div>;
}

export function AdminSuccessToast({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-status-success/20 bg-status-successBg px-4 py-3 text-sm font-medium text-status-success">
      {message}
    </div>
  );
}
