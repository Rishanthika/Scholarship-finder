import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FutureGrad Scholarship Finder",
  description:
    "Find scholarships and funding opportunities that may fit your study-abroad profile — checked against official sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts loaded via a standard <link>, not next/font/google.
          next/font fetches fonts at BUILD TIME — if the build environment
          has no network access to fonts.googleapis.com (as discovered in
          this session's own sandbox), the entire production build fails
          outright. A <link> tag instead degrades gracefully at runtime:
          if a browser can't reach Google Fonts, it silently falls back
          to the system-font stack defined in globals.css, and the build
          itself never depends on network access at all.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] bg-brand-background font-body text-brand-ink antialiased">{children}</body>
    </html>
  );
}
