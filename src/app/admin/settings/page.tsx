"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <h1 className="font-heading text-2xl font-bold text-brand-ink">Settings</h1>
      <p className="mt-1 text-sm text-brand-muted">Nothing configurable here yet.</p>

      <div className="mt-6 rounded-2xl border border-dashed border-brand-border/15 p-8 text-center text-sm text-brand-muted">
        No admin settings exist yet — this page is a placeholder for future staff/access management, not a
        functioning settings screen. See the README &ldquo;Admin dashboard&rdquo; section for what&rsquo;s still needed
        (authentication being the main one) before this becomes meaningful.
      </div>
    </AdminLayout>
  );
}
