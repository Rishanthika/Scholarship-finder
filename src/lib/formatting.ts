import type { Scholarship } from "@/types";

export type DeadlineState = "open" | "passed" | "unconfirmed";

export function getDeadlineState(scholarship: Scholarship): DeadlineState {
  if (!scholarship.deadline || !scholarship.deadline_confirmed) return "unconfirmed";
  return new Date(scholarship.deadline) < new Date() ? "passed" : "open";
}

/** Short label for the compact result card. */
export function formatDeadlineShort(scholarship: Scholarship): string {
  const state = getDeadlineState(scholarship);
  if (state === "unconfirmed") return "Next cycle not yet confirmed";
  if (state === "passed") return "Deadline passed";
  return `Deadline: ${scholarship.deadline}`;
}

/** Longer label for the detail view. */
export function formatDeadlineDetail(scholarship: Scholarship): string {
  const state = getDeadlineState(scholarship);
  if (state === "unconfirmed") return "Next cycle not yet confirmed";
  if (state === "passed") return `Deadline passed (${scholarship.deadline}) — this cycle has closed; check the official page for the next intake`;
  return `Open — deadline ${scholarship.deadline}`;
}
