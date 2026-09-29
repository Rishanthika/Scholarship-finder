/**
 * Minimal analytics event hooks (product spec Phase 24 / §15).
 *
 * No analytics provider is configured yet. This function currently just
 * logs to the console so every call site in the app is already correctly
 * placed — swap the body for a real provider call (Plausible, GA, etc.)
 * without touching any component.
 *
 * The 6 MVP events, all fired from exactly one place each:
 *   assessment_started    -> src/app/page.tsx
 *   assessment_completed  -> src/app/page.tsx
 *   results_viewed        -> src/app/page.tsx
 *   scholarship_viewed    -> src/app/page.tsx
 *   official_link_clicked -> src/components/ScholarshipDetail.tsx
 *   lead_submitted        -> src/components/LeadCaptureCard.tsx
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, properties ?? {});
  }
}
