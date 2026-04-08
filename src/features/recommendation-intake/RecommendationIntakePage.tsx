"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { useAssessmentParams } from "@/hooks/useAssessmentParams";
import { submitLeadToWP } from "@/lib/submitLead";
import { PILLAR_DEFINITIONS, type PillarIconKey } from "@/lib/pillarAnchors";
import {
  DEFAULT_RECOMMENDATION_INPUTS,
  buildProgramRecommendation,
  type RecommendationInputs,
} from "@/lib/programRecommendation";
import type {
  ProgramBudgetPreference,
  CurrentSafetySetup,
  ProgramExposureRisk,
  ProgramLocationModel,
  ProgramWorkType,
} from "@/lib/programConfig";

type StepId =
  | "company"
  | "profile"
  | "exposures"
  | "current_setup"
  | "budget";

type WizardStep = {
  id: StepId;
  sectionLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  progressLabel: string;
};

type GuidanceSection = {
  title: string;
  body: string;
};

type GuidanceContent = {
  selectedLabel: string | null;
  sections: GuidanceSection[];
};

const STEPS: WizardStep[] = [
  {
    id: "company",
    sectionLabel: "Start",
    heroTitle: "Build your safety eyewear recommendation",
    heroSubtitle:
      "Complete five quick steps so we can generate a recommendation that matches your operation.",
    progressLabel: "Start",
  },
  {
    id: "profile",
    sectionLabel: "Team Profile",
    heroTitle: "Tell us about your team",
    heroSubtitle:
      "Choose your industry, team size, and location model so we can size the recommendation correctly.",
    progressLabel: "Team Profile",
  },
  {
    id: "exposures",
    sectionLabel: "Exposures",
    heroTitle: "What hazards does your team face on the job?",
    heroSubtitle: "Select the main exposure conditions your team deals with.",
    progressLabel: "Exposures",
  },
  {
    id: "current_setup",
    sectionLabel: "Setup",
    heroTitle: "How are things set up today?",
    heroSubtitle: "Tell us how orders, approvals, and delivery are handled today.",
    progressLabel: "Setup",
  },
  {
    id: "budget",
    sectionLabel: "Budget Goals",
    heroTitle: "What are your budget goals?",
    heroSubtitle: "Pick the budget range that best matches your current plan.",
    progressLabel: "Budget Goals",
  },
];

const FOUR_PILLAR_BY_STEP: Record<StepId, PillarIconKey | null> = {
  company: null,
  profile: "reliability",
  exposures: "human_first",
  current_setup: "follow_through",
  budget: "adoption",
};

const SETUP_SECTION_BADGES: Record<CurrentSetupSectionId, string> = {
  funding: "6A",
  approval: "6B",
  delivery: "6C",
  coverage_type: "6D",
};

const RECOMMENDATION_START_STEP_KEY = "osso_recommendation_start_step";

const WORK_TYPE_OPTIONS: Array<{
  value: ProgramWorkType;
  label: string;
}> = [
  {
    value: "manufacturing",
    label: "Manufacturing & Production",
  },
  {
    value: "construction",
    label: "Construction & Field Work",
  },
  {
    value: "utilities",
    label: "Utilities & Field Services",
  },
  {
    value: "warehouse",
    label: "Warehouse & Distribution",
  },
  {
    value: "healthcare",
    label: "Healthcare & Clinical",
  },
  {
    value: "public_sector",
    label: "Public Sector & Municipal",
  },
  {
    value: "laboratory",
    label: "Laboratory & Research",
  },
  {
    value: "other",
    label: "Other",
  },
];

const COVERAGE_BANDS: Array<{
  value: RecommendationInputs["coverageSizeBand"];
  label: string;
  helper: string;
}> = [
  {
    value: "1_50",
    label: "1 to 50",
    helper:
      "Teams in this range usually operate with a single point of coordination and a straightforward service model for onboarding, replacements, and approvals.",
  },
  {
    value: "51_100",
    label: "51 to 100",
    helper:
      "This range typically needs a repeatable process for new hires, order support, and replacement tracking across teams and supervisors.",
  },
  {
    value: "101_200",
    label: "101 to 200",
    helper:
      "Programs at this size usually require stronger routing for approvals, consistent fulfillment support, and clear ownership of exceptions.",
  },
  {
    value: "201_plus",
    label: "200+",
    helper:
      "At this scale, onboarding, reorders, and exceptions run in parallel across managers and sites, so service consistency and governance become central to program performance.",
  },
];

const LOCATION_MODELS: Array<{
  id: "single" | "multi_same_region" | "multi_across_regions";
  value: ProgramLocationModel;
  label: string;
  helper: string;
}> = [
  {
    id: "single",
    value: "single",
    label: "Single Location",
    helper:
      "A single-location program runs through one site with one local operating rhythm, one approval chain, and one fulfillment pattern for employees.",
  },
  {
    id: "multi_same_region",
    value: "multi_same_region",
    label: "Multiple Locations Same Region",
    helper:
      "Locations in the same region usually share similar scheduling windows and shipping patterns, while still needing site-level ownership and reporting for each location.",
  },
  {
    id: "multi_across_regions",
    value: "multi_across_regions",
    label: "Multiple Locations Across Regions",
    helper:
      "Locations spread across regions require consistent standards with regional execution plans, so approvals, delivery timing, and support can stay aligned across all sites.",
  },
];

const EXPOSURE_OPTIONS: Array<{
  id: string;
  values: ProgramExposureRisk[];
  label: string;
  helper: string;
}> = [
  {
    id: "high_impact",
    values: ["high_impact"],
    label: "High Impact",
    helper: "Frequent impact risk from tools or active equipment.",
  },
  {
    id: "dust_debris",
    values: ["dust_debris"],
    label: "Dust or Debris",
    helper: "Regular airborne particles from cutting, grinding, or sanding.",
  },
  {
    id: "chemical_splash",
    values: ["chemical_splash"],
    label: "Chemical Splash",
    helper: "Liquid or chemical contact risk during normal work.",
  },
  {
    id: "glare_shift",
    values: ["outdoor_glare", "indoor_outdoor_shift"],
    label: "Outdoor Glare and Light Shifts",
    helper: "Frequent glare and transitions between indoor and outdoor work.",
  },
  {
    id: "fog_temp",
    values: ["fog_humidity", "temperature_extremes"],
    label: "Fog or Extreme Temperatures",
    helper: "Fogging or temperature swings that affect visibility and wear time.",
  },
  {
    id: "screen_intensive",
    values: ["screen_intensive"],
    label: "High Screen Usage",
    helper: "Long periods of screen work during a typical shift.",
  },
];

type CurrentSetupSectionId =
  | "funding"
  | "approval"
  | "delivery"
  | "coverage_type";

const CURRENT_SETUP_SECTIONS: Array<{
  id: CurrentSetupSectionId;
  title: string;
  helper: string;
  options: Array<{ value: CurrentSafetySetup; label: string; helper: string }>;
}> = [
  {
    id: "funding",
    title: "Safety Program",
    helper: "How is safety eyewear paid for today?",
    options: [
      {
        value: "voucher",
        label: "Voucher / Reimbursement",
        helper: "Employees use vouchers or reimbursement.",
      },
      {
        value: "covered_through_vision_insurance",
        label: "Covered Through Vision Insurance",
        helper: "Coverage runs through vision insurance.",
      },
      {
        value: "vendor_optometry_partnership",
        label: "Sole Vendor Partnership",
        helper: "One vendor manages fitting, ordering, and delivery.",
      },
    ],
  },
  {
    id: "approval",
    title: "Approval Workflow",
    helper: "How many approval steps are required?",
    options: [
      {
        value: "single_approval_process",
        label: "Single Approval Process",
        helper: "One person approves before release.",
      },
      {
        value: "multiple_approval_process",
        label: "Multiple Approval Process",
        helper: "More than one stakeholder must approve.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery Method",
    helper: "How do employees receive eyewear?",
    options: [
      {
        value: "employee_self_order",
        label: "Employee Self-Order",
        helper: "Employees place their own orders.",
      },
      {
        value: "onsite_events",
        label: "Onsite Events",
        helper: "Scheduled onsite fitting and ordering events.",
      },
      {
        value: "mail_fulfillment",
        label: "Online Ordering",
        helper: "Orders are placed online and shipped.",
      },
      {
        value: "hybrid_delivery",
        label: "Hybrid",
        helper: "Uses more than one delivery method.",
      },
    ],
  },
  {
    id: "coverage_type",
    title: "Coverage Type",
    helper: "What eyewear types are covered?",
    options: [
      {
        value: "prescription_safety_eyewear",
        label: "Prescription Safety Eyewear",
        helper: "Prescription safety eyewear is included.",
      },
      {
        value: "non_prescription_safety_eyewear",
        label: "Non Prescription Safety Eyewear",
        helper: "Non-prescription safety eyewear is included.",
      },
      {
        value: "hybrid_eyewear",
        label: "Hybrid Model",
        helper: "Both prescription and non-prescription pathways are used.",
      },
    ],
  },
];

const BUDGET_OPTIONS: Array<{
  value: ProgramBudgetPreference;
  label: string;
  helper: string;
  impact: string;
}> = [
  {
    value: "super_strict",
    label: "Lean Budget",
    helper: "Best for tighter budgets and essential program controls.",
    impact: "Focuses on core compliance and cost control.",
  },
  {
    value: "good_budget",
    label: "Balanced Budget",
    helper: "Best for stable operations with moderate flexibility.",
    impact: "Balances service quality and budget discipline.",
  },
  {
    value: "unlimited_budget",
    label: "Growth Budget",
    helper: "Best for higher investment and long-term program scale.",
    impact: "Supports deeper service structure and broader program support.",
  },
];

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toggleMulti<T extends string>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function cardClass(selected: boolean) {
  return `relative w-full rounded-md border border-border bg-card p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
    selected
      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25"
      : "hover:border-ring hover:bg-secondary/50"
  }`;
}

function exposureCardClass(
  focused: boolean,
  selected: boolean,
  compact = false,
) {
  const densityClass = compact ? "p-3" : "p-4";
  const focusClass =
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
  if (focused || selected) {
    return `group relative w-full rounded-lg border border-primary bg-primary/10 ${densityClass} text-left shadow-sm ring-2 ring-primary/25 transition ${focusClass}`;
  }
  return `group relative w-full rounded-lg border border-border bg-card ${densityClass} text-left transition hover:border-ring hover:bg-secondary/35 ${focusClass}`;
}

function stepProgressLabel(stepIndex: number) {
  return `Step ${stepIndex + 1} of ${STEPS.length}`;
}

function setupSectionBadge(sectionId: CurrentSetupSectionId) {
  return SETUP_SECTION_BADGES[sectionId];
}

function selectedBadge() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-sm">
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="h-4 w-4 fill-none stroke-current stroke-[2.25]"
      >
        <path d="M3.5 8.25L6.75 11.5L12.5 5.75" />
      </svg>
    </span>
  );
}

function setupSectionForItem(item: CurrentSafetySetup) {
  return (
    CURRENT_SETUP_SECTIONS.find((section) =>
      section.options.some((option) => option.value === item),
    ) ?? null
  );
}

const ACTIVE_SETUP_VALUES = new Set(
  CURRENT_SETUP_SECTIONS.flatMap((section) =>
    section.options.map((option) => option.value),
  ),
);

function sanitizeSetupSelections(values: CurrentSafetySetup[]) {
  return values.filter((value) => ACTIVE_SETUP_VALUES.has(value));
}

function consumeInitialStepIndex() {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(RECOMMENDATION_START_STEP_KEY);
  if (raw == null) return 0;
  window.sessionStorage.removeItem(RECOMMENDATION_START_STEP_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.trunc(parsed);
  return Math.max(0, Math.min(rounded, STEPS.length - 1));
}

export function RecommendationIntakePage({
  onNavigate,
}: {
  onNavigate: NavigateFn;
}) {
  const { updateDraft } = useProgramDraft();
  const assessment = useAssessmentParams();

  const [initialStepIndex] = useState(() => consumeInitialStepIndex());
  const [form, setForm] = useState<RecommendationInputs>(() => ({
    ...DEFAULT_RECOMMENDATION_INPUTS,
  }));
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [assessmentApplied, setAssessmentApplied] = useState(false);
  const [framingDismissed, setFramingDismissed] = useState(false);
  const [hasFormalProgram, setHasFormalProgram] = useState<boolean | null>(
    null,
  );
  const [activeExposureFocus, setActiveExposureFocus] =
    useState<ProgramExposureRisk | null>(null);
  const [activeSetupFocus, setActiveSetupFocus] =
    useState<CurrentSafetySetup | null>(null);
  const [activeSetupSection, setActiveSetupSection] =
    useState<CurrentSetupSectionId>("funding");
  const [collapsedSetupSections, setCollapsedSetupSections] = useState<
    Record<CurrentSetupSectionId, boolean>
  >({
    funding: true,
    approval: true,
    delivery: true,
    coverage_type: true,
  });
  const [error, setError] = useState<string>("");
  const setupSectionRefs = useRef<
    Record<CurrentSetupSectionId, HTMLElement | null>
  >({
    funding: null,
    approval: null,
    delivery: null,
    coverage_type: null,
  });

  // Pre-fill form from assessment URL params (runs once)
  useEffect(() => {
    if (assessmentApplied || !assessment.hasAssessmentContext) return;
    setAssessmentApplied(true);

    setForm((prev) => {
      const next = { ...prev };
      if (assessment.firstName && assessment.lastName) {
        next.contactName = `${assessment.firstName} ${assessment.lastName}`.trim();
      }
      if (assessment.email) next.email = assessment.email;
      if (assessment.company) next.companyName = assessment.company;
      if (assessment.phone) next.phone = assessment.phone;
      if (assessment.setupHints && assessment.setupHints.length > 0) {
        const hints = assessment.setupHints;
        const hasLegacyNoFormal = hints.includes("no_formal_program");
        const sanitized = sanitizeSetupSelections(hints);
        setHasFormalProgram(hasLegacyNoFormal ? false : sanitized.length > 0);
        next.currentSafetySetup = hasLegacyNoFormal ? [] : sanitized;
      }
      if (assessment.budgetHint) {
        next.budgetPreference = assessment.budgetHint;
      }
      return next;
    });
  }, [assessment, assessmentApplied]);

  const step = STEPS[stepIndex];
  const progress = clamp01(stepIndex / (STEPS.length - 1));
  const pillarAnchor = FOUR_PILLAR_BY_STEP[step.id];
  const shouldShowPreWizardFraming = stepIndex === 0 && !framingDismissed;

  const guidance = useMemo(() => {
    return buildGuidance({
      stepId: step.id,
      form,
      hasFormalProgram,
      activeExposureFocus,
      activeSetupFocus,
      activeSetupSection,
      collapsedSetupSections,
    });
  }, [
    activeExposureFocus,
    activeSetupFocus,
    activeSetupSection,
    collapsedSetupSections,
    form,
    hasFormalProgram,
    step.id,
  ]);
  void guidance;

  function setField<K extends keyof RecommendationInputs>(
    key: K,
    value: RecommendationInputs[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setSetupFocus(item: CurrentSafetySetup | null) {
    setActiveSetupFocus(item);
    if (!item) return;
    const section = setupSectionForItem(item);
    if (section) {
      setActiveSetupSection(section.id);
      setCollapsedSetupSections((prev) =>
        prev[section.id] ? { ...prev, [section.id]: false } : prev,
      );
    }
  }

  function toggleSetupSelection(item: CurrentSafetySetup) {
    const selected = form.currentSafetySetup.includes(item);
    if (selected) {
      const next = form.currentSafetySetup.filter((v) => v !== item);
      setField("currentSafetySetup", next);
      if (activeSetupFocus === item) {
        setSetupFocus(next[next.length - 1] ?? null);
      }
      return;
    }

    const section = setupSectionForItem(item);
    if (!section) {
      const next = toggleMulti(form.currentSafetySetup, item);
      setField("currentSafetySetup", next);
      return;
    }

    const sectionValues = section.options.map((option) => option.value);
    const next = [
      ...form.currentSafetySetup.filter((v) => !sectionValues.includes(v)),
      item,
    ];
    setField("currentSafetySetup", next);
    setActiveSetupSection(section.id);
    setCollapsedSetupSections((prev) =>
      prev[section.id] ? { ...prev, [section.id]: false } : prev,
    );
    setSetupFocus(item);
  }

  function toggleSetupSection(sectionId: CurrentSetupSectionId) {
    setCollapsedSetupSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
    setActiveSetupSection(sectionId);
  }

  useEffect(() => {
    if (step.id !== "current_setup") return;
    const refs = setupSectionRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (
            !topEntry ||
            entry.intersectionRatio > topEntry.intersectionRatio
          ) {
            topEntry = entry;
          }
        }
        if (!topEntry) return;
        const sectionId = (topEntry.target as HTMLElement).dataset
          .setupSection as CurrentSetupSectionId | undefined;
        if (!sectionId) return;
        setActiveSetupSection(sectionId);
      },
      {
        root: null,
        rootMargin: "-25% 0px -50% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    for (const sectionId of Object.keys(refs) as CurrentSetupSectionId[]) {
      const node = refs[sectionId];
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [step.id, collapsedSetupSections]);

  function goToStep(nextIndex: number, fromPopState = false) {
    setError("");
    const clamped = Math.max(0, Math.min(nextIndex, STEPS.length - 1));
    if (clamped === 0) setFramingDismissed(false);
    setStepIndex(clamped);
    // Push browser history so the browser Back button navigates wizard steps
    if (!fromPopState) {
      window.history.pushState({ wizardStep: clamped }, "");
    }
  }

  // Handle browser back/forward for wizard steps
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const state = e.state as { wizardStep?: number } | null;
      if (state && typeof state.wizardStep === "number") {
        goToStep(state.wizardStep, true);
      }
    }
    window.addEventListener("popstate", handlePopState);
    // Seed initial state so back from step 1 ? step 0 works
    if (
      !window.history.state?.wizardStep &&
      window.history.state?.wizardStep !== 0
    ) {
      window.history.replaceState({ wizardStep: stepIndex }, "");
    }
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goNext() {
    goToStep(stepIndex + 1);
  }

  function goBack() {
    goToStep(stepIndex - 1);
  }

  function onComplete() {
    setError("");
    try {
      const { draftPatch, programConfig } = buildProgramRecommendation(form);
      updateDraft((prev) => ({
        ...draftPatch,
        programConfig: {
          active: draftPatch.programConfig?.active,
          manualDraftSnapshot: prev,
        },
      }));

      // Submit lead to WordPress via serverless proxy
      const nameParts = form.contactName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") || "";
      submitLeadToWP({
        first_name: firstName,
        last_name: lastName,
        work_email: form.email,
        company: form.companyName,
        phone: form.phone || undefined,
        assessment_total_score: assessment.score?.toString(),
        assessment_maturity_level: assessment.maturity ?? undefined,
        assessment_category_scores: assessment.categories
          ? JSON.stringify(assessment.categories)
          : undefined,
        recommendation_service_tier: programConfig.recommendedStructure?.serviceTier,
        recommendation_eu_package: draftPatch.program?.selectedEU ?? undefined,
        recommendation_posture_tier: programConfig.readinessTier,
      }).then((result) => {
        if (!result.ok) console.warn("Lead submission failed:", result.error);
      });

      onNavigate("recommendation_summary", "internal");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unable to generate recommendation.";
      setError(message);
    }
  }

  // Per-step visual paths.
  const STEP_IMAGES: Record<StepId, string> = {
    company: "/images/step-01-company.jpg",
    profile: "/images/step-02-work-type.jpg",
    exposures: "/images/step-05-exposures.jpg",
    current_setup: "/images/step-06-current-setup.jpg",
    budget: "/images/step-07-program-posture.jpg",
  };

  const stepImage = STEP_IMAGES[step.id];

  return (
    <section aria-labelledby="recommendation-title">
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-0">
        <SectionWrap className="pt-3 pb-8 sm:pt-4 sm:pb-9">
          {/* -- Progress bar + step nav -- */}
          <div className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
            <div className="mb-4 border-b border-border/80 pb-4">
              <h1
                id="recommendation-title"
                className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[2rem]"
              >
                {step.heroTitle}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {step.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className={secondaryButtonClass}
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                {pillarAnchor ? (
                  <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/80 bg-card text-primary"
                    >
                      {PILLAR_DEFINITIONS[pillarAnchor].icon}
                    </span>
                    <span className="font-medium text-foreground/90">
                      {PILLAR_DEFINITIONS[pillarAnchor].phrase}
                    </span>
                  </div>
                ) : null}
                <div className="text-sm font-semibold text-foreground">
                  {stepProgressLabel(stepIndex)}
                </div>
              </div>
            </div>

            {/* Progress track */}
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold tracking-wide md:grid-cols-5">
                {STEPS.map((item, idx) => {
                  const active = idx === stepIndex;
                  const complete = idx < stepIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToStep(idx)}
                      aria-current={active ? "step" : undefined}
                      className={`rounded-full border px-3 py-1.5 text-center leading-snug transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : complete
                            ? "border-primary/40 bg-primary/5 text-primary/80"
                            : "border-border bg-background text-muted-foreground hover:border-ring hover:bg-secondary/50"
                      }`}
                    >
                      {complete && (
                        <span
                          className="mr-1 inline-block text-primary/70"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                      {item.progressLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {assessment.hasAssessmentContext ? (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
              <p className="text-sm font-semibold text-blue-900">Assessment Results Loaded</p>
              <p className="mt-1 text-sm text-blue-700">
                Your <strong>{assessment.maturity}</strong> maturity assessment (score: {assessment.score}/24)
                has been factored into this recommendation. Contact info and program setup hints have been pre-filled.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-stretch">
            <div className="space-y-6 lg:col-span-8">
              {shouldShowPreWizardFraming ? (
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <img
                    src="/images/intro-program-builder.jpg"
                    alt="Program specialist reviewing a safety eyewear plan with a team"
                    className="aspect-[16/5] w-full object-cover object-[center_30%]"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width={1280}
                    height={640}
                  />
                  <div className="p-5">
                    <p className="text-base font-bold text-foreground">
                      What you will complete in this wizard
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Share your team profile, exposure risks, setup details, and budget direction. We use this to build a recommendation you can review quickly with your specialist.
                    </p>
                  </div>
                </div>
              ) : null}

              {step.id === "profile" ? (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                    <label
                      htmlFor="profile-work-type"
                      className="text-sm font-semibold text-foreground"
                    >
                      Industry
                    </label>
                    <select
                      id="profile-work-type"
                      value={form.workType}
                      onChange={(event) =>
                        setField("workType", event.target.value as ProgramWorkType)
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {WORK_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </div>

                    <div>
                    <label
                      htmlFor="profile-team-size"
                      className="text-sm font-semibold text-foreground"
                    >
                      Team size
                    </label>
                    <select
                      id="profile-team-size"
                      value={form.coverageSizeBand}
                      onChange={(event) =>
                        setField(
                          "coverageSizeBand",
                          event.target
                            .value as RecommendationInputs["coverageSizeBand"],
                        )
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {COVERAGE_BANDS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </div>

                    <div className="md:col-span-2">
                    <label
                      htmlFor="profile-location-model"
                      className="text-sm font-semibold text-foreground"
                    >
                      Locations
                    </label>
                    <select
                      id="profile-location-model"
                      value={form.locationModel}
                      onChange={(event) =>
                        setField(
                          "locationModel",
                          event.target.value as RecommendationInputs["locationModel"],
                        )
                      }
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {LOCATION_MODELS.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {step.id === "exposures" ? (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {EXPOSURE_OPTIONS.map((opt, idx) => {
                    const selected = opt.values.every((value) =>
                      form.exposureRisks.includes(value),
                    );
                    const focused = opt.values.includes(
                      activeExposureFocus ?? "high_impact",
                    );
                    const isFinalOddCard =
                      EXPOSURE_OPTIONS.length % 2 === 1 &&
                      idx === EXPOSURE_OPTIONS.length - 1;
                    return (
                      <div
                        key={opt.id}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          selected
                            ? `Unselect ${opt.label}`
                            : `Select ${opt.label}`
                        }
                        aria-pressed={selected}
                        onClick={() => {
                          const next = selected
                            ? form.exposureRisks.filter(
                                (risk) => !opt.values.includes(risk),
                              )
                            : Array.from(
                                new Set([...form.exposureRisks, ...opt.values]),
                              );
                          setField("exposureRisks", next);
                          setActiveExposureFocus(opt.values[0] ?? null);
                        }}
                        onFocus={() => setActiveExposureFocus(opt.values[0] ?? null)}
                        onMouseEnter={() =>
                          setActiveExposureFocus(opt.values[0] ?? null)
                        }
                        onMouseLeave={() => {
                          setActiveExposureFocus((prev) =>
                            prev && opt.values.includes(prev) ? null : prev,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            const next = selected
                              ? form.exposureRisks.filter(
                                  (risk) => !opt.values.includes(risk),
                                )
                              : Array.from(
                                  new Set([
                                    ...form.exposureRisks,
                                    ...opt.values,
                                  ]),
                                );
                            setField("exposureRisks", next);
                            setActiveExposureFocus(opt.values[0] ?? null);
                          }
                        }}
                        className={`${exposureCardClass(focused, selected)} ${isFinalOddCard ? "sm:col-span-2" : ""}`}
                      >
                        {focused ? (
                          <span
                            className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary"
                            aria-hidden="true"
                          />
                        ) : null}

                        <div className="flex items-center justify-end">
                          {selected ? selectedBadge() : null}
                        </div>

                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {opt.label}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {opt.helper}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : null}

              {step.id === "current_setup" ? (
                <div className="space-y-6">
                  <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
                    <p className="text-sm font-semibold text-foreground">
                      Do you have a formal safety eyewear program in place?
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        className={cardClass(hasFormalProgram === true)}
                        onClick={() => setHasFormalProgram(true)}
                      >
                        <div className="absolute right-3 top-3">
                          {hasFormalProgram === true ? selectedBadge() : null}
                        </div>
                        <div className="pr-10 text-sm font-semibold text-foreground">
                          Yes
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          Show setup details so we can match your current structure.
                        </div>
                      </button>

                      <button
                        type="button"
                        className={cardClass(hasFormalProgram === false)}
                        onClick={() => {
                          setHasFormalProgram(false);
                          setField("currentSafetySetup", []);
                          setActiveSetupFocus(null);
                        }}
                      >
                        <div className="absolute right-3 top-3">
                          {hasFormalProgram === false ? selectedBadge() : null}
                        </div>
                        <div className="pr-10 text-sm font-semibold text-foreground">
                          No
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          Skip setup details and continue to budget goals.
                        </div>
                      </button>
                    </div>
                  </section>

                  {hasFormalProgram ? (
                    <>
                      {CURRENT_SETUP_SECTIONS.map((section) => {
                        const sectionCollapsed = collapsedSetupSections[section.id];
                        const sectionFocused = activeSetupSection === section.id;
                        return (
                          <section
                            key={section.id}
                            ref={(node) => {
                              setupSectionRefs.current[section.id] = node;
                            }}
                            data-setup-section={section.id}
                            className="rounded-lg border border-border bg-card p-4 sm:p-5"
                          >
                            <button
                              type="button"
                              onClick={() => toggleSetupSection(section.id)}
                              className="flex w-full items-start justify-between gap-3 text-left"
                              aria-expanded={!sectionCollapsed}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                    {setupSectionBadge(section.id)}
                                  </span>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                    {section.title}
                                  </p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {section.helper}
                                </p>
                              </div>
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wide ${
                                  sectionFocused
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {sectionCollapsed ? "Expand" : "Collapse"}
                              </span>
                            </button>

                            {sectionCollapsed ? null : (
                              <div className="mt-4 border-t border-border pt-4">
                                <div
                                  className={`grid gap-3 ${section.options.length > 1 ? "sm:grid-cols-2" : ""}`}
                                >
                                  {section.options.map((opt) => {
                                    const selected =
                                      form.currentSafetySetup.includes(opt.value);
                                    const focused = activeSetupFocus === opt.value;
                                    return (
                                      <div
                                        key={opt.value}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={
                                          selected
                                            ? `Unselect ${opt.label}`
                                            : `Select ${opt.label}`
                                        }
                                        aria-pressed={selected}
                                        onClick={() =>
                                          toggleSetupSelection(opt.value)
                                        }
                                        onFocus={() => {
                                          setActiveSetupSection(section.id);
                                          setSetupFocus(opt.value);
                                        }}
                                        onMouseEnter={() => {
                                          setActiveSetupSection(section.id);
                                          setSetupFocus(opt.value);
                                        }}
                                        onMouseLeave={() => {
                                          setActiveSetupFocus((prev) =>
                                            prev === opt.value ? null : prev,
                                          );
                                        }}
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                          ) {
                                            event.preventDefault();
                                            toggleSetupSelection(opt.value);
                                          }
                                        }}
                                        className={exposureCardClass(
                                          focused,
                                          selected,
                                          true,
                                        )}
                                      >
                                        {focused ? (
                                          <span
                                            className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary"
                                            aria-hidden="true"
                                          />
                                        ) : null}

                                        <div className="flex items-center justify-end">
                                          {selected ? selectedBadge() : null}
                                        </div>

                                        <div className="text-sm font-semibold leading-tight text-foreground">
                                          {opt.label}
                                        </div>
                                        <div className="mt-1 text-xs leading-snug text-muted-foreground">
                                          {opt.helper}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </>
                  ) : null}
                </div>
              ) : null}

              {step.id === "budget" ? (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                  {BUDGET_OPTIONS.map((opt) => {
                    const selected = form.budgetPreference === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={cardClass(selected)}
                        onClick={() => setField("budgetPreference", opt.value)}
                      >
                        <div className="absolute right-3 top-3">
                          {selected ? selectedBadge() : null}
                        </div>
                        <div className="pr-10 text-sm font-semibold text-foreground">
                          {opt.label}
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          {opt.helper} {opt.impact}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  className={secondaryButtonClass}
                >
                  Back
                </button>

                {stepIndex < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className={primaryButtonClass}
                  >
                    Continue
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onComplete}
                      className={primaryButtonClass}
                    >
                      Build My Recommendation
                    </button>
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden lg:col-span-4 lg:flex">
              <div className="flex h-full w-full">
                <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-[#f0f4fb]">
                  <img
                    src={stepImage}
                    alt="Program guidance visual"
                    className="h-full w-full object-cover object-[center_25%]"
                    loading="lazy"
                    decoding="async"
                    width={840}
                    height={920}
                  />
                </div>
              </div>
            </aside>
          </div>

        </SectionWrap>
      </div>
    </section>
  );
}

function guidanceSections(...sections: GuidanceSection[]): GuidanceSection[] {
  return sections;
}

function selectedSetupInSection(
  selectedSetup: CurrentSafetySetup[],
  sectionId: CurrentSetupSectionId,
) {
  const section = CURRENT_SETUP_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return null;
  return (
    section.options.find((option) => selectedSetup.includes(option.value))
      ?.value ?? null
  );
}

function buildGuidance(args: {
  stepId: StepId;
  form: RecommendationInputs;
  hasFormalProgram: boolean | null;
  activeExposureFocus: ProgramExposureRisk | null;
  activeSetupFocus: CurrentSafetySetup | null;
  activeSetupSection: CurrentSetupSectionId;
  collapsedSetupSections: Record<CurrentSetupSectionId, boolean>;
}): GuidanceContent {
  const { stepId, form } = args;

  if (stepId === "company") {
    return {
      selectedLabel: null,
      sections: guidanceSections(
        {
          title: "What you will enter",
          body: "You will provide your team profile, exposure risks, current setup, and budget direction.",
        },
        {
          title: "Why this matters",
          body: "These answers determine the recommendation structure so your review is focused and actionable.",
        },
      ),
    };
  }

  if (stepId === "profile") {
    const selected =
      WORK_TYPE_OPTIONS.find((option) => option.value === form.workType)
        ?.label ?? null;
    const workTypeGuidance = workTypeExplainer(form.workType);
    const locationLabel =
      LOCATION_MODELS.find((option) => option.value === form.locationModel)
        ?.label ?? "";
    const teamLabel =
      COVERAGE_BANDS.find((option) => option.value === form.coverageSizeBand)
        ?.label ?? "";
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        {
          title: "What this step sets",
          body: "Industry, team size, and location structure set the baseline for service level, coverage planning, and support model.",
        },
        {
          title: "Industry context",
          body: workTypeGuidance.needs,
        },
        {
          title: "Your current selection",
          body: `Team size: ${teamLabel}. Location model: ${locationLabel}.`,
        },
      ),
    };
  }

  if (stepId === "exposures") {
    const selected = form.exposureRisks;
    const active =
      args.activeExposureFocus && selected.includes(args.activeExposureFocus)
        ? args.activeExposureFocus
        : (selected[0] ?? null);
    if (!active) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          {
            title: "What your exposure profile tells us",
            body: "The exposures you select determine which product features, lens treatments, and add-ons are built into the recommendation. More accurate input produces a more useful output.",
          },
          {
            title: "Why accuracy here matters",
            body: "Exposure accuracy drives wear behavior and replacement frequency. An incomplete profile produces a generic recommendation — the kind that gets overridden the first time conditions don't match the standard.",
          },
        ),
      };
    }
    const copy = exposureExplainer(active);
    return {
      selectedLabel: exposureLabel(active),
      sections: guidanceSections(
        {
          title: "What this means in real work conditions",
          body: copy.meaning,
        },
        {
          title: "How this affects the recommendation",
          body: copy.implications,
        },
        { title: "Where accuracy protects consistency", body: copy.compliance },
      ),
    };
  }

  if (stepId === "budget") {
    if (!form.budgetPreference) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          {
            title: "What this step covers",
            body: "Select the budget goal that best reflects how your organization plans to prioritize compliance, operations, and program support.",
          },
          {
            title: "How this fits into your recommendation",
            body: "Budget goals help determine coverage depth, service structure, and where additional support should be prioritized.",
          },
          {
            title: "How to choose",
            body: "Choose the option that matches current planning priorities so your recommendation reflects realistic budget expectations and operational needs.",
          },
        ),
      };
    }
    const selectedBudget = form.budgetPreference;
    const copy = budgetPreferenceExplainer(selectedBudget);
    return {
      selectedLabel: budgetPreferenceLabel(selectedBudget),
      sections: guidanceSections(
        { title: "Your budget approach", body: copy.impact },
      ),
    };
  }

  const isSetupCollapsedDefault = Object.values(
    args.collapsedSetupSections,
  ).every(Boolean);
  if (args.hasFormalProgram === false) {
    return {
      selectedLabel: "Setup details skipped",
      sections: guidanceSections(
        {
          title: "What this means",
          body: "You can skip setup details for now. We will still generate a practical baseline recommendation.",
        },
        {
          title: "What happens next",
          body: "Budget goals and exposure details will guide how structured the recommendation should be.",
        },
      ),
    };
  }

  if (isSetupCollapsedDefault) {
    return {
      selectedLabel: null,
      sections: guidanceSections(
        {
          title: "What this step covers",
          body: "The previous stages described your team, locations, and exposures. This step defines how the program currently operates for access, approvals, and delivery.",
        },
        {
          title: "Please pay close attention here",
          body: "These selections show how work is actually routed today. Accurate setup details help us recommend service structure, ownership, and support workflows that align with your operating model.",
        },
      ),
    };
  }

  const activeSection = args.activeSetupSection;
  const activeInSection = selectedSetupInSection(
    form.currentSafetySetup,
    activeSection,
  );
  const activeSelection =
    args.activeSetupFocus &&
    setupSectionForItem(args.activeSetupFocus)?.id === activeSection
      ? args.activeSetupFocus
      : activeInSection;
  if (activeSection === "coverage_type") {
    if (!activeSelection) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          {
            title: "What this section controls",
            body: "Coverage type determines whether employees are routed through prescription, non-prescription, or hybrid pathways.",
          },
          {
            title: "Where this decision shows up first",
            body: "This choice immediately affects eligibility validation, replacement cadence, and the support workload tied to remakes and exceptions.",
          },
        ),
      };
    }
    const copy = setupExplainer(activeSelection);
    return {
      selectedLabel: setupLabel(activeSelection),
      sections: guidanceSections(
        { title: "Compliance and audit trail", body: copy.compliance },
        {
          title: "Employee adoption and wear consistency",
          body: copy.structure,
        },
        {
          title: "Replacement cadence and coordination load",
          body: copy.admin,
        },
      ),
    };
  }

  if (!activeSelection) {
    const sectionTitle =
      activeSection === "funding"
        ? "Safety Program"
        : activeSection === "approval"
          ? "Approval Workflow"
          : "Delivery Method";
    const sectionControlMap: Record<
      Exclude<CurrentSetupSectionId, "coverage_type">,
      string
    > = {
      funding:
        "Funding structure sets who pays, what's standardized, and how much variation the program allows before exceptions become the default response.",
      approval:
        "Approval workflow defines who signs off on orders, where exceptions go, and how long employees wait. Every approval that doesn't have a clear owner becomes a delay.",
      delivery:
        "Delivery Method determines how employees access fittings, ordering, and fulfillment in day-to-day operations.",
    };
    const sectionPressureMap: Record<
      Exclude<CurrentSetupSectionId, "coverage_type">,
      string
    > = {
      funding:
        "The first operational signal is exception traffic; unclear funding boundaries quickly create manual overrides and follow-up.",
      approval:
        "The first breakdown point is queue ownership; when no role owns turnaround targets, fulfillment becomes unpredictable.",
      delivery:
        "Early friction appears at handoffs between ordering and receipt, especially when support channels are unclear by site.",
    };
    const scopedSection =
      activeSection === "funding" ||
      activeSection === "approval" ||
      activeSection === "delivery"
        ? activeSection
        : "funding";
    return {
      selectedLabel: null,
      sections: guidanceSections(
        {
          title: `What ${sectionTitle} is deciding`,
          body: sectionControlMap[scopedSection],
        },
        {
          title: "Where execution pressure appears first",
          body: sectionPressureMap[scopedSection],
        },
      ),
    };
  }

  const copy = setupExplainer(activeSelection);
  return {
    selectedLabel: setupLabel(activeSelection),
    sections: guidanceSections(
      {
        title: "How this affects your program structure",
        body: copy.structure,
      },
      {
        title: "How this influences compliance consistency",
        body: copy.compliance,
      },
      { title: "How this changes coordination load", body: copy.admin },
    ),
  };
}

function workTypeExplainer(workType: ProgramWorkType) {
  const map: Record<ProgramWorkType, { needs: string; pattern: string }> = {
    manufacturing: {
      needs:
        "Recommendations prioritize impact-rated durability, all-shift comfort, and fast remake support — because when a lens scratches out on second shift, the replacement can't wait until Monday.",
      pattern:
        "Programs that hold up in manufacturing build replacement pathways before they're needed — shift-based staffing turns eligibility over fast, and reactive programs always fall behind.",
    },
    construction: {
      needs:
        "Field-heavy recommendations emphasize secure retention, debris coverage, glare control, and rapid replacement support for crews moving between active sites.",
      pattern:
        "Construction programs hold up when every site lead enforces one standard ordering path across crews and subcontractors instead of local one-off rules.",
    },
    utilities: {
      needs:
        "Utility recommendations center on variable-light visibility, anti-fog reliability, and PPE-compatible fit that performs during mobile dispatch work.",
      pattern:
        "Programs succeed here when approvals and fulfillment are anchored to territory ownership, so coverage remains consistent as crews rotate and routes change.",
    },
    warehouse: {
      needs:
        "Warehouse recommendations focus on impact-ready daily wear, scratch resilience, and predictable reorder access — because high-turnover environments need replacement to be automatic, not an exception process.",
      pattern:
        "Programs perform best when onboarding and replacement are triggered from workforce rosters, not ad hoc requests after a problem appears.",
    },
    healthcare: {
      needs:
        "Healthcare recommendations prioritize optical clarity, cleaning-cycle durability, and role-based splash protection that staff can wear continuously during clinical flow.",
      pattern:
        "Healthcare programs stay reliable when infection-control and unit leaders share one approved coverage matrix instead of maintaining parallel local lists.",
    },
    public_sector: {
      needs:
        "Public-sector recommendations emphasize standardized options, role-linked eligibility, and reporting outputs that map directly to governance and procurement requirements.",
      pattern:
        "Successful public-sector programs document policy once at the governance level and execute it consistently through named department contacts.",
    },
    laboratory: {
      needs:
        "Laboratory recommendations prioritize sealed or splash-oriented designs, anti-fog performance, and strict option control tied to protocol-driven tasks.",
      pattern:
        "Lab programs work when approved eyewear options are mapped to procedure classes — selections driven by protocol, not supervisor preference, and not workarounds when the standard option doesn't arrive on time.",
    },
    other: {
      needs:
        "For mixed environments, recommendations start with a compliant core package and add tightly controlled features for roles that face distinct exposure profiles.",
      pattern:
        "These programs stay stable when every exception has a named owner and review cadence, preventing custom requests from becoming the default model.",
    },
  };
  return map[workType];
}

function exposureLabel(risk: ProgramExposureRisk) {
  const map: Record<ProgramExposureRisk, string> = {
    high_impact: "High Impact",
    dust_debris: "Dust or Debris",
    chemical_splash: "Chemical Splash",
    outdoor_glare: "Outdoor Glare and Light Shifts",
    fog_humidity: "Fog or Extreme Temperatures",
    indoor_outdoor_shift: "Outdoor Glare and Light Shifts",
    screen_intensive: "High Screen Usage",
    temperature_extremes: "Fog or Extreme Temperatures",
  };
  return map[risk];
}

function exposureExplainer(risk: ProgramExposureRisk) {
  const map: Record<
    ProgramExposureRisk,
    { meaning: string; implications: string; compliance: string }
  > = {
    high_impact: {
      meaning:
        "Employees operate near tools, machinery, or high-movement activity where unexpected impact events are realistic.",
      implications:
        "Prioritize high-durability frames, dependable side protection, and fit consistency that holds during active motion.",
      compliance:
        "Programs should define approved frame classes and replacement triggers up front — reactive replacement after a damage event is where compliance gaps usually start.",
    },
    dust_debris: {
      meaning:
        "Sanding, cutting, grinding, and airborne particulates create persistent lens contamination and wear pressure.",
      implications:
        "Scratch-resistant treatments and wrap-forward coverage improve uptime, visibility, and replacement performance.",
      compliance:
        "Defined side-coverage and lens standards reduce inconsistent selections that can create policy and safety gaps.",
    },
    chemical_splash: {
      meaning:
        "Tasks include chemical or irritant exposure where fluid contact risk requires stronger protective controls.",
      implications:
        "Splash-oriented designs and material choices should be aligned to role risk and replacement responsiveness.",
      compliance:
        "Policies often require strict protection classes, clear approved options, and tightly controlled substitutions.",
    },
    outdoor_glare: {
      meaning:
        "Outdoor exposure to bright light and reflective surfaces can reduce visual comfort and hazard awareness.",
      implications:
        "Glare-management options support safer visibility, stronger comfort, and higher day-to-day wear consistency.",
      compliance:
        "Define whether glare-management options are role-based or open — undefined eligibility here tends to become the most-requested exception category.",
    },
    fog_humidity: {
      meaning:
        "Humidity and temperature transitions cause fogging that interrupts task flow and increases safety frustration.",
      implications:
        "Anti-fog options reduce visibility interruptions, helping employees stay productive and compliant on shift.",
      compliance:
        "Eligibility rules should define when anti-fog is standard, optional, or role-mandated to control consistency.",
    },
    indoor_outdoor_shift: {
      meaning:
        "Employees repeatedly move between indoor and outdoor zones with rapid lighting and environmental changes.",
      implications:
        "Transition-support technologies can reduce adaptation lag and improve safety confidence during movement-heavy work.",
      compliance:
        "Policy should define approved lens-transition technologies and any restrictions by role or site requirements.",
    },
    screen_intensive: {
      meaning:
        "Extended screen time builds visual fatigue across the shift — and fatigued employees are more likely to remove their eyewear or stop wearing it altogether.",
      implications:
        "Anti-reflective and blue-light-support options can improve clarity, comfort, and sustained program adoption.",
      compliance:
        "Clear add-on eligibility controls help prevent inconsistent upgrades, reimbursement disputes, and billing leakage.",
    },
    temperature_extremes: {
      meaning:
        "Workers move through heat and cold conditions that can impact comfort, fog behavior, and lens consistency over a shift.",
      implications:
        "Programs should prioritize stable performance in changing temperatures so visibility remains dependable during task transitions.",
      compliance:
        "Define when temperature-supportive options are required by role to reduce exceptions and keep policy decisions consistent.",
    },
  };
  return map[risk];
}

function setupLabel(item: CurrentSafetySetup) {
  const map: Record<CurrentSafetySetup, string> = {
    no_formal_program: "No Formal Program",
    reimbursement: "Sole Vendor Partnership",
    covered_through_vision_insurance: "Covered Through Vision Insurance",
    vendor_optometry_partnership: "Sole Vendor Partnership",
    voucher: "Voucher / Reimbursement",
    employer_fully_covered: "Employer Fully Covered",
    employer_base_with_upgrades: "Employer Base with Upgrades",
    no_formal_approval_process: "No Formal Approval Process",
    single_approval_process: "Single Approval Process",
    multiple_approval_process: "Multiple Approval Process",
    onsite_events: "Onsite Events",
    regional_service_centers: "Regional Service Centers",
    mail_fulfillment: "Online Ordering",
    employee_self_order: "Employee Self-Order",
    hybrid_model: "Hybrid",
    hybrid_delivery: "Hybrid",
    prescription_safety_eyewear: "Prescription Safety Eyewear",
    non_prescription_safety_eyewear: "Non Prescription Safety Eyewear",
    otg_non_prescription_eyewear: "Bulk Over the Glasses (OTG)",
    hybrid_eyewear: "Hybrid Model",
  };
  return map[item];
}

function setupExplainer(item: CurrentSafetySetup) {
  const map: Record<
    CurrentSafetySetup,
    { structure: string; compliance: string; admin: string }
  > = {
    no_formal_program: {
      structure:
        "Purchases happen as needed, eligibility isn't defined, and enforcement depends on whoever is paying attention that week.",
      compliance:
        "Compliance performance depends heavily on local manager behavior and individual buying decisions.",
      admin:
        "Every request becomes a clarification. Every new hire becomes an exception. Administrative friction is high because the program is running on improvisation.",
    },
    reimbursement: {
      structure:
        "Safety eyewear is routed through a partner vendor or optometry network tied to vision benefits coverage.",
      compliance:
        "Compliance improves when partner catalogs and eligibility rules are aligned to approved safety standards.",
      admin:
        "Switching from an existing partner is a real operational step. Your specialist will walk through what that transition looks like and what stays the same.",
    },
    covered_through_vision_insurance: {
      structure:
        "Safety eyewear is managed inside the existing vision insurance framework, including plan eligibility and covered item rules.",
      compliance:
        "Compliance consistency depends on how well insurance plan options align with approved safety standards and role requirements.",
      admin:
        "Administration usually centers on plan verification, eligibility interpretation, and handling exceptions when requested items fall outside covered options.",
    },
    vendor_optometry_partnership: {
      structure:
        "Safety eyewear is routed through a sole vendor partnership with an established operating process.",
      compliance:
        "Compliance improves when the partner catalog and eligibility rules are aligned to approved safety standards.",
      admin:
        "Administration centers on keeping ordering, fitting, and fulfillment consistent across locations and roles.",
    },
    voucher: {
      structure:
        "Voucher and reimbursement controls channel employees into approved pathways with clear guardrails.",
      compliance:
        "Compliance improves when voucher or reimbursement eligibility maps tightly to policy-approved products and roles.",
      admin:
        "Administration is moderate, centered on issuance, reimbursement validation, tracking, and periodic policy cleanup.",
    },
    employee_self_order: {
      structure:
        "Employees place and manage orders directly through approved channels with minimal coordinator intervention.",
      compliance:
        "Strong ordering guardrails are required so employees stay within approved product and eligibility rules.",
      admin:
        "Administration shifts toward policy communication, exception handling, and periodic ordering audits.",
    },
    employer_fully_covered: {
      structure:
        "Employer funds the approved compliant set directly, reducing employee financial barriers to adoption.",
      compliance:
        "Control is strong when covered options are standardized and exceptions follow a defined approval path.",
      admin:
        "After launch, administration is typically lower because billing and employee decisions are simplified.",
    },
    employer_base_with_upgrades: {
      structure:
        "Employer funds a compliant baseline while employees can elect upgrades under controlled rules.",
      compliance:
        "Baseline compliance remains consistent as long as upgrade boundaries are clearly documented and enforced.",
      admin:
        "Administration is moderate, with ongoing oversight needed for upgrade eligibility and billing boundaries.",
    },
    no_formal_approval_process: {
      structure:
        "Orders and exceptions route through a required approval checkpoint before fulfillment.",
      compliance:
        "This adds control over policy adherence and reduces unapproved ordering paths.",
      admin:
        "Queue ownership and turnaround targets matter a lot here – undefined approval chains are where fulfillment quietly becomes unpredictable.",
    },
    single_approval_process: {
      structure:
        "Orders and exceptions route through a required approval checkpoint before fulfillment.",
      compliance:
        "This adds control over policy adherence and reduces unapproved ordering paths.",
      admin:
        "Queue ownership and turnaround targets matter a lot here – undefined approval chains are where fulfillment quietly becomes unpredictable.",
    },
    multiple_approval_process: {
      structure:
        "A centralized safety team owns approvals, standards, and exception decisions across the organization.",
      compliance:
        "This model supports stronger consistency, cleaner documentation, and stronger audit consistency.",
      admin:
        "Admin workload is concentrated centrally, but process quality and decision clarity are usually higher.",
    },
    onsite_events: {
      structure:
        "Employees are fitted and ordered during scheduled onsite service sessions managed at the worksite.",
      compliance:
        "Selection and fitting happen in a controlled event setting with direct alignment to approved program options.",
      admin:
        "Administration centers on event planning, attendance coordination, and site readiness for each service window.",
    },
    regional_service_centers: {
      structure:
        "Regional centers provide in-person ordering and adjustment support for multiple nearby facilities.",
      compliance:
        "Consistency depends on center-level adherence to approved products and standardized workflows.",
      admin:
        "Coordination requirements are moderate, especially around appointments, center capacity, and site communication.",
    },
    mail_fulfillment: {
      structure:
        "Orders are placed online and fulfilled directly, expanding access without requiring onsite event cadence.",
      compliance:
        "Compliance depends on eligibility guardrails staying tight — without them, self-ordering environments drift toward catalog choices that fall outside policy.",
      admin:
        "Scheduling overhead drops, while fit guidance, support handling, and return management typically increase.",
    },
    hybrid_model: {
      structure:
        "Hybrid delivery combines onsite events with mail or center-based fulfillment by location and role needs.",
      compliance:
        "This model works best when standards remain consistent across every delivery channel and approval path.",
      admin:
        "Administration is moderate to high, focused on channel coordination, communication, and policy consistency.",
    },
    hybrid_delivery: {
      structure:
        "Hybrid delivery combines onsite events with mail or center-based fulfillment by location and role needs.",
      compliance:
        "This model works best when standards remain consistent across every delivery channel and approval path.",
      admin:
        "Administration is moderate to high, focused on channel coordination, communication, and policy consistency.",
    },
    prescription_safety_eyewear: {
      structure:
        "Program is centered on prescription safety eyewear as the primary employee pathway.",
      compliance:
        "Prescription verification, lens standards, and fit controls should be clearly documented.",
      admin:
        "Administration covers prescription workflows, remakes, and role-based exception handling.",
    },
    non_prescription_safety_eyewear: {
      structure:
        "Program is centered on non-prescription safety eyewear as the primary employee pathway.",
      compliance:
        "Standards should define approved frame and lens options by role so non-prescription selections stay compliant.",
      admin:
        "Administration is typically lighter than prescription workflows but still requires clear eligibility controls.",
    },
    otg_non_prescription_eyewear: {
      structure:
        "Program uses bulk OTG safety eyewear for employees who wear personal prescription glasses.",
      compliance:
        "Standards should define approved OTG designs, fit criteria, and role-level requirements.",
      admin:
        "Administration typically focuses on bulk inventory control, replacement cadence, and site-level availability.",
    },
    hybrid_eyewear: {
      structure:
        "Program combines prescription and non-prescription pathways by role.",
      compliance:
        "Strong eligibility rules are required so each employee is routed to the correct compliant coverage pathway.",
      admin:
        "Administration is moderate to high due to multi-path inventory, validation, and exception governance.",
    },
  };
  return map[item];
}

function budgetPreferenceLabel(value: ProgramBudgetPreference) {
  const map: Record<ProgramBudgetPreference, string> = {
    super_strict: "Lean Budget",
    low_budget: "Lean Budget",
    good_budget: "Balanced Budget",
    unlimited_budget: "Growth Budget",
  };
  return map[value];
}

function budgetPreferenceExplainer(value: ProgramBudgetPreference) {
  const map: Record<
    ProgramBudgetPreference,
    { impact: string; recommendation: string; bestFor: string }
  > = {
    super_strict: {
      impact:
        "Foundational control is the priority. Recommendations emphasize clear standards, tighter guardrails, and predictable execution.",
      recommendation: "",
      bestFor: "",
    },
    low_budget: {
      impact:
        "Lean operations are the priority. Recommendations focus on practical service coverage with disciplined spend and dependable day-to-day workflows.",
      recommendation: "",
      bestFor: "",
    },
    good_budget: {
      impact:
        "Balanced performance supports stronger adoption, smoother operations, and better consistency across the program.",
      recommendation: "",
      bestFor: "",
    },
    unlimited_budget: {
      impact:
        "Strategic scale supports deeper partnership, broader governance, and long-term resilience for complex operations.",
      recommendation: "",
      bestFor: "",
    },
  };
  return map[value];
}
