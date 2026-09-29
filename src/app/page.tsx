"use client";

import { useState } from "react";
import type { MatchApiResponse, StudentProfile, LeadInfo } from "@/types";
import { LandingScreen } from "@/components/LandingScreen";
import { AssessmentFlow } from "@/components/AssessmentFlow";
import { LoadingState } from "@/components/LoadingState";
import { ResultsScreen } from "@/components/ResultsScreen";
import { ScholarshipDetail } from "@/components/ScholarshipDetail";
import { EmptyState } from "@/components/EmptyState";
import { track } from "@/lib/analytics";

type Screen = "landing" | "assessment" | "loading" | "results" | "detail" | "error";

const EMPTY_LEAD: LeadInfo = { name: "", phone: "", email: "" };

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [matchResponse, setMatchResponse] = useState<MatchApiResponse | null>(null);
  const [submittedProfile, setSubmittedProfile] = useState<StudentProfile | null>(null);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  // Lifted to this top-level component (not local to LandingScreen) so it
  // survives the student navigating back from the assessment to the
  // Welcome screen and forward again — see AssessmentFlow's step-1 "Back"
  // behavior, which calls onExitToLanding() and re-renders LandingScreen
  // as a controlled component with whatever is already in this state.
  const [lead, setLead] = useState<LeadInfo>(EMPTY_LEAD);

  const handleStart = () => {
    // Lead info (name/phone/email) was already validated inside
    // LandingScreen before this is called — collected here in local
    // application state only. No Privyr/SmartTask/Airtable call happens
    // at this point or anywhere else in this phase.
    track("assessment_started");
    setScreen("assessment");
  };

  const handleAssessmentComplete = async (profile: StudentProfile) => {
    track("assessment_completed");
    setSubmittedProfile(profile);
    setScreen("loading");
    track("matching_started");

    try {
      // `profile` here is the StudentProfile object exactly as before —
      // name/phone/email are never included in this payload, so they
      // cannot affect matching in any way.
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Matching request failed");
      const data: MatchApiResponse = await res.json();

      await new Promise((r) => setTimeout(r, 1200));

      setMatchResponse(data);
      track("results_viewed", { count: data.results.length, green: data.greenCount, amber: data.amberCount });
      setScreen("results");
    } catch (err) {
      console.error(err);
      setScreen("error");
    }
  };

  const handleViewScholarship = (id: string) => {
    track("scholarship_viewed", { scholarshipId: id });
    setSelectedScholarshipId(id);
    setScreen("detail");
  };

  const handleBackToResults = () => setScreen("results");

  const handleStartOver = () => {
    setMatchResponse(null);
    setSelectedScholarshipId(null);
    setScreen("landing");
    // Deliberately NOT resetting `lead` here — if a student starts over
    // within the same session, there's no reason to make them re-type
    // their contact details.
  };

  if (screen === "landing") return <LandingScreen lead={lead} onLeadChange={setLead} onStart={handleStart} />;

  if (screen === "assessment") {
    return <AssessmentFlow onComplete={handleAssessmentComplete} onExitToLanding={() => setScreen("landing")} />;
  }

  if (screen === "loading") return <LoadingState />;

  if (screen === "error") {
    return (
      <div className="mx-auto max-w-app px-5 py-10">
        <EmptyState variant="error" onContactFutureGrad={handleStartOver} />
      </div>
    );
  }

  if (screen === "results" && matchResponse && submittedProfile) {
    return (
      <ResultsScreen
        response={matchResponse}
        profile={submittedProfile}
        leadName={lead.name}
        onSaveResults={() =>
          fetch("/api/lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: lead.name,
              contact: lead.phone,
              email: lead.email,
              matchedScholarshipIds: matchResponse.results.map((r) => r.scholarship.id),
            }),
          }).catch(() => {
            // Best-effort for MVP, same as before — a failed save should
            // never block the student from continuing to browse results.
          })
        }
        onViewScholarship={handleViewScholarship}
        onStartOver={handleStartOver}
      />
    );
  }

  if (screen === "detail" && matchResponse && submittedProfile && selectedScholarshipId) {
    const result = matchResponse.results.find((r) => r.scholarship.id === selectedScholarshipId);
    if (!result)
      return (
        <ResultsScreen
          response={matchResponse}
          profile={submittedProfile}
          leadName={lead.name}
          onSaveResults={() => {}}
          onViewScholarship={handleViewScholarship}
          onStartOver={handleStartOver}
        />
      );
    return <ScholarshipDetail result={result} onBack={handleBackToResults} />;
  }

  return <LandingScreen lead={lead} onLeadChange={setLead} onStart={handleStart} />;
}
