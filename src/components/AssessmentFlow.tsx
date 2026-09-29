"use client";

import { useState } from "react";
import type { StudentProfile } from "@/types";
import { AssessmentStep } from "./AssessmentStep";
import { RadioCardQuestion, CheckboxListQuestion, NumberInputQuestion } from "./Question";
import { GraduationCap, BookOpen, Microscope, FlaskConical, Telescope, Wallet, Banknote, Coins, Sparkles } from "lucide-react";
import {
  ACADEMIC_FIELD_OPTIONS,
  ENGINEERING_DOMAIN_GROUPS,
  ENGLISH_TEST_OPTIONS,
  WORK_EXPERIENCE_OPTIONS,
  GRADING_SYSTEM_OPTIONS,
  INTAKE_OPTIONS,
  TIER1_COUNTRIES,
} from "@/lib/options";

const TOTAL_STEPS = 6;

// Icon-augmented variants of the base option lists, used only for the two
// questions the design brief specifically called out for a richer card
// treatment (icon + description). Values match DEGREE_LEVEL_OPTIONS /
// FUNDING_PREFERENCE_OPTIONS exactly — this is presentation only, the
// underlying enum values feeding the matching engine are unchanged.
const DEGREE_LEVEL_CARDS = [
  { value: "undergraduate", label: "Undergraduate", description: "Bachelor's degree", icon: GraduationCap },
  { value: "masters", label: "Master's", description: "Postgraduate degree", icon: BookOpen },
  { value: "phd", label: "PhD or Doctoral", description: "Research doctorate", icon: Microscope },
  { value: "postdoctoral", label: "Postdoctoral", description: "Advanced research", icon: FlaskConical },
  { value: "research", label: "Research degree", description: "Research-based programme", icon: Telescope },
];

const FUNDING_PREFERENCE_CARDS = [
  { value: "fully_funded_only", label: "Fully funded only", description: "Tuition + living costs", icon: Wallet },
  { value: "full_tuition_ok", label: "Full tuition is enough", description: "I can cover living costs", icon: Banknote },
  { value: "partial_ok", label: "Partial funding is fine", description: "Any tuition support helps", icon: Coins },
  { value: "any", label: "Open to any funding", description: "Show me everything available", icon: Sparkles },
];

// A partial, in-progress version of the profile while the student is still
// answering — every field becomes required by the time step 6 submits.
type DraftProfile = Partial<StudentProfile>;

interface AssessmentFlowProps {
  onComplete: (profile: StudentProfile) => void;
  onExitToLanding: () => void;
}

export function AssessmentFlow({ onComplete, onExitToLanding }: AssessmentFlowProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<DraftProfile>({
    engineeringDomains: [],
    standardizedTests: [],
    preferredCountries: [],
    countryFilterMode: "no_preference",
    currentEducationLevel: "bachelors",
  });

  const update = (patch: DraftProfile) => setDraft((d) => ({ ...d, ...patch }));

  const goBack = () => {
    if (step === 1) {
      onExitToLanding();
    } else {
      setStep((s) => s - 1);
    }
  };

  const isEngineeringOrTech = draft.intendedField === "engineering" || draft.intendedField === "computer_science_technology";

  // --- Per-step validation (required-field enforcement, product spec §1) ---
  const stepIsValid: Record<number, boolean> = {
    1: Boolean(draft.nationality && draft.currentEducationLevel),
    2: Boolean(draft.degreeLevel && draft.intake),
    3: Boolean(draft.intendedField) && Boolean(!isEngineeringOrTech || (draft.engineeringDomains && draft.engineeringDomains.length > 0)),
    4: Boolean(draft.gradingSystem && draft.academicScore !== null && draft.academicScore !== undefined && draft.englishTest),
    5: Boolean(draft.workExperience && draft.hasResearchExperience !== undefined),
    6: Boolean(
      draft.fundingPreference &&
        (draft.countryFilterMode === "no_preference" || (draft.preferredCountries && draft.preferredCountries.length > 0))
    ),
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    // Final step — assemble the complete, validated StudentProfile.
    const complete: StudentProfile = {
      nationality: draft.nationality!,
      currentEducationLevel: draft.currentEducationLevel!,
      degreeLevel: draft.degreeLevel!,
      intake: draft.intake!,
      intendedField: draft.intendedField!,
      engineeringDomains: draft.engineeringDomains ?? [],
      gradingSystem: draft.gradingSystem!,
      academicScore: draft.academicScore ?? null,
      englishTest: draft.englishTest!,
      englishScore: draft.englishScore ?? null,
      standardizedTests: draft.standardizedTests ?? [],
      workExperience: draft.workExperience!,
      hasResearchExperience: draft.hasResearchExperience!,
      preferredCountries: draft.preferredCountries ?? [],
      countryFilterMode: draft.countryFilterMode ?? "no_preference",
      fundingPreference: draft.fundingPreference!,
    };
    onComplete(complete);
  };

  if (step === 1) {
    return (
      <AssessmentStep
        step={1}
        totalSteps={TOTAL_STEPS}
        title="About You"
        subtitle="Let's start with a couple of quick basics."
        onBack={goBack}
        onNext={handleNext}
        nextDisabled={!stepIsValid[1]}
      >
        <RadioCardQuestion
          label="What is your nationality?"
          name="nationality"
          value={draft.nationality ?? null}
          onChange={(v) => update({ nationality: v })}
          options={[
            { value: "India", label: "India" },
            { value: "Other", label: "Other" },
          ]}
        />
        <RadioCardQuestion
          label="What have you most recently completed?"
          name="currentEducationLevel"
          value={draft.currentEducationLevel ?? null}
          onChange={(v) => update({ currentEducationLevel: v as StudentProfile["currentEducationLevel"] })}
          options={[
            { value: "high_school", label: "High school" },
            { value: "bachelors", label: "Bachelor's degree" },
            { value: "masters", label: "Master's degree" },
          ]}
        />
      </AssessmentStep>
    );
  }

  if (step === 2) {
    return (
      <AssessmentStep
        step={2}
        totalSteps={TOTAL_STEPS}
        title="Your Study Plans"
        onBack={goBack}
        onNext={handleNext}
        nextDisabled={!stepIsValid[2]}
      >
        <RadioCardQuestion
          label="What degree are you applying for?"
          name="degreeLevel"
          value={draft.degreeLevel ?? null}
          onChange={(v) => update({ degreeLevel: v as StudentProfile["degreeLevel"] })}
          options={DEGREE_LEVEL_CARDS}
        />
        <RadioCardQuestion
          label="Which intake are you targeting?"
          name="intake"
          value={draft.intake ?? null}
          onChange={(v) => update({ intake: v })}
          options={INTAKE_OPTIONS}
        />
      </AssessmentStep>
    );
  }

  if (step === 3) {
    return (
      <AssessmentStep
        step={3}
        totalSteps={TOTAL_STEPS}
        title="Academic Background"
        onBack={goBack}
        onNext={handleNext}
        nextDisabled={!stepIsValid[3]}
      >
        <RadioCardQuestion
          label="What's your intended field of study?"
          name="intendedField"
          value={draft.intendedField ?? null}
          onChange={(v) => update({ intendedField: v as StudentProfile["intendedField"], engineeringDomains: [] })}
          options={ACADEMIC_FIELD_OPTIONS}
        />
        {isEngineeringOrTech && (
          <div className="space-y-4">
            {ENGINEERING_DOMAIN_GROUPS.map((group) => (
              <RadioCardQuestion
                key={group.group}
                label={group.group}
                name={`engineeringDomain-${group.group}`}
                value={draft.engineeringDomains?.find((d) => group.options.some((o) => o.value === d)) ?? null}
                onChange={(v) =>
                  update({
                    engineeringDomains: [
                      ...(draft.engineeringDomains ?? []).filter((d) => !group.options.some((o) => o.value === d)),
                      v as StudentProfile["engineeringDomains"][number],
                    ],
                  })
                }
                options={group.options}
              />
            ))}
          </div>
        )}
      </AssessmentStep>
    );
  }

  if (step === 4) {
    const gradingOpt = GRADING_SYSTEM_OPTIONS.find((g) => g.value === draft.gradingSystem);
    return (
      <AssessmentStep
        step={4}
        totalSteps={TOTAL_STEPS}
        title="Your Academic Profile"
        onBack={goBack}
        onNext={handleNext}
        nextDisabled={!stepIsValid[4]}
      >
        <RadioCardQuestion
          label="What grading system does your marksheet use?"
          name="gradingSystem"
          value={draft.gradingSystem ?? null}
          onChange={(v) => update({ gradingSystem: v as StudentProfile["gradingSystem"] })}
          options={GRADING_SYSTEM_OPTIONS}
        />
        <NumberInputQuestion
          label="What's your score?"
          value={draft.academicScore ?? null}
          onChange={(v) => update({ academicScore: v })}
          placeholder={gradingOpt?.placeholder}
        />
        <RadioCardQuestion
          label="Have you taken an English test?"
          name="englishTest"
          value={draft.englishTest ?? null}
          onChange={(v) => update({ englishTest: v as StudentProfile["englishTest"] })}
          options={ENGLISH_TEST_OPTIONS}
        />
        {draft.englishTest && draft.englishTest !== "not_taken" && draft.englishTest !== "exempt" && (
          <NumberInputQuestion
            label="What was your score?"
            value={draft.englishScore ?? null}
            onChange={(v) => update({ englishScore: v })}
          />
        )}
      </AssessmentStep>
    );
  }

  if (step === 5) {
    return (
      <AssessmentStep
        step={5}
        totalSteps={TOTAL_STEPS}
        title="Experience & Tests"
        onBack={goBack}
        onNext={handleNext}
        nextDisabled={!stepIsValid[5]}
      >
        <RadioCardQuestion
          label="How much full-time work experience do you have after your degree?"
          name="workExperience"
          value={draft.workExperience ?? null}
          onChange={(v) => update({ workExperience: v as StudentProfile["workExperience"] })}
          options={WORK_EXPERIENCE_OPTIONS}
        />
        <RadioCardQuestion
          label="Do you have research experience — a thesis, published paper, or lab work?"
          name="hasResearchExperience"
          value={draft.hasResearchExperience === undefined ? null : String(draft.hasResearchExperience)}
          onChange={(v) => update({ hasResearchExperience: v === "true" })}
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
        />
      </AssessmentStep>
    );
  }

  // Step 6
  return (
    <AssessmentStep
      step={6}
      totalSteps={TOTAL_STEPS}
      title="Funding & Destination Preferences"
      onBack={goBack}
      onNext={handleNext}
      nextLabel="Find My Matches"
      nextDisabled={!stepIsValid[6]}
    >
      <CheckboxListQuestion
        label="Which countries are you interested in studying in?"
        name="preferredCountries"
        values={draft.preferredCountries ?? []}
        onChange={(v) => update({ preferredCountries: v, countryFilterMode: v.length > 0 ? "preferred" : "no_preference" })}
        options={TIER1_COUNTRIES.map((c) => ({ value: c, label: c }))}
      />
      {(draft.preferredCountries?.length ?? 0) > 0 && (
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input
            type="checkbox"
            checked={draft.countryFilterMode === "only_these"}
            onChange={(e) => update({ countryFilterMode: e.target.checked ? "only_these" : "preferred" })}
            className="h-4 w-4 rounded border-brand-surface text-brand-primary focus:ring-brand-primary"
          />
          Only show me these countries
        </label>
      )}
      <RadioCardQuestion
        label="What kind of funding are you looking for?"
        name="fundingPreference"
        value={draft.fundingPreference ?? null}
        onChange={(v) => update({ fundingPreference: v as StudentProfile["fundingPreference"] })}
        options={FUNDING_PREFERENCE_CARDS}
      />
    </AssessmentStep>
  );
}
