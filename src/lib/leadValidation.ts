import type { LeadInfo } from "@/types";

export interface LeadInfoErrors {
  name?: string;
  phone?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Permissive international phone check: optional leading +, 7-15 digits,
// allowing spaces/hyphens/parentheses as separators. Deliberately not
// stricter than this — the brief calls out not rejecting valid
// international numbers just to enforce a narrow Indian-only pattern.
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,16}$/;

export function validateLeadInfo(lead: LeadInfo): LeadInfoErrors {
  const errors: LeadInfoErrors = {};

  const trimmedName = lead.name.trim();
  if (!trimmedName) {
    errors.name = "Please enter your full name.";
  } else if (trimmedName.length < 2 || !/[a-zA-Z]/.test(trimmedName)) {
    errors.name = "Please enter a valid name.";
  }

  const trimmedPhone = lead.phone.trim();
  if (!trimmedPhone) {
    errors.phone = "Please enter your phone number.";
  } else if (!PHONE_RE.test(trimmedPhone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  const trimmedEmail = lead.email.trim();
  if (!trimmedEmail) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_RE.test(trimmedEmail)) {
    errors.email = "Please enter a valid email address.";
  }

  return errors;
}

export function isLeadInfoValid(lead: LeadInfo): boolean {
  return Object.keys(validateLeadInfo(lead)).length === 0;
}
