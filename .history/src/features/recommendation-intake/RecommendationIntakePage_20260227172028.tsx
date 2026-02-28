"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { formatPhoneAsUs, isValidEmailFormat } from "@/lib/contactValidation";
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
  | "work_type"
  | "coverage"
  | "locations"
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
    sectionLabel: "Contact",
    heroTitle: "Let's start with you",
    heroSubtitle:
      "We'll use this to personalize your recommendation and know who to follow up with",
    progressLabel: "Contact",
  },
  {
    id: "work_type",
    sectionLabel: "Industry",
    heroTitle: "What kind of work does your team do?",
    heroSubtitle:
      "This helps us match the right protection to your environment",
    progressLabel: "Industry",
  },
  {
    id: "coverage",
    sectionLabel: "Team Size",
    heroTitle: "How big is the team we're covering?",
    heroSubtitle: "Team size helps us recommend the right program structure",
    progressLabel: "Team Size",
  },
  {
    id: "locations",
    sectionLabel: "Locations",
    heroTitle: "Where is your team located?",
    heroSubtitle: "We'll make sure the program works wherever your people are",
    progressLabel: "Locations",
  },
  {
    id: "exposures",
    sectionLabel: "Exposures",
    heroTitle: "What hazards does your team face on the job?",
    heroSubtitle:
      "The more specific you are here, the better your recommendation will be",
    progressLabel: "Exposures",
  },
  {
    id: "current_setup",
    sectionLabel: "Setup",
    heroTitle: "How are things set up today?",
    heroSubtitle:
      "We'll build around what's already working — not start from scratch",
    progressLabel: "Setup",
  },
  {
    id: "budget",
    sectionLabel: "Program Posture",
    heroTitle: "Where does your program stand right now?",
    heroSubtitle:
      "No wrong answer here — we just want to meet you where you are",
    progressLabel: "Posture",
  },
];

const FOUR_PILLAR_BY_STEP: Record<StepId, PillarIconKey | null> = {
  company: null,
  work_type: "human_first",
  coverage: "reliability",
  locations: "reliability",
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
  helper: string;
}> = [
  {
    value: "manufacturing",
    label: "Manufacturing & Production",
    helper:
      "Production floors and assembly lines where durable daily eyewear and quick remake access keep your team protected without slowing things down.",
  },
  {
    value: "construction",
    label: "Construction & Field Work",
    helper:
      "Active job sites with impact hazards, debris, and changing conditions — your program needs to flex around crews without adding headaches.",
  },
  {
    value: "utilities",
    label: "Utilities & Field Services",
    helper:
      "Field teams spread across territory where conditions vary and compliance documentation has to keep up with the work.",
  },
  {
    value: "warehouse",
    label: "Warehouse & Distribution",
    helper:
      "Fast-moving distribution environments where reliable daily wear and easy reordering prevent gaps without extra admin work.",
  },
  {
    value: "healthcare",
    label: "Healthcare & Clinical",
    helper:
      "Clinical settings where optical clarity, durability through cleaning cycles, and splash protection make the difference between eyewear that gets worn and eyewear that doesn't.",
  },
  {
    value: "public_sector",
    label: "Public Sector & Municipal",
    helper:
      "Multi-department environments where procurement standards and eligibility rules need to stay consistent across the board.",
  },
  {
    value: "laboratory",
    label: "Laboratory & Research",
    helper:
      "Lab and research settings where splash protection and anti-fog reliability aren't nice-to-haves — they're required by the work itself.",
  },
  {
    value: "other",
    label: "Specialized / Mixed Environment",
    helper:
      "If your operation doesn't fit neatly into one category, that's totally fine — we build custom structures for edge cases all the time.",
  },
];

const COVERAGE_BANDS: Array<{
  value: RecommendationInputs["coverageSizeBand"];
  label: string;
  helper: string;
}> = [
  {
    value: "1_30",
    label: "1 to 30",
    helper:
      "A small, tight-knit team — one point of contact, simple eligibility, and a program that runs without a lot of overhead.",
  },
  {
    value: "31_60",
    label: "31 to 60",
    helper:
      "Your team is growing past the point where informal coordination works. A repeatable process starts to really pay off here.",
  },
  {
    value: "61_100",
    label: "61 to 100",
    helper:
      "With multiple supervisors submitting requests, missed handoffs become the biggest source of delays — a clear workflow keeps things moving.",
  },
  {
    value: "101_250",
    label: "101 to 250",
    helper:
      "Programs spanning departments or buildings need clear routing and approvals — informal rules start to break down at this size.",
  },
  {
    value: "251_500",
    label: "251 to 500",
    helper:
      "Onboarding, reorders, and exceptions are all happening at the same time across your org — coordination is ongoing work at this scale.",
  },
  {
    value: "500_plus",
    label: "500+",
    helper:
      "Enterprise-scale operations running across sites, shifts, and roles — visibility and governance aren't optional, they're infrastructure.",
  },
];

const LOCATION_MODELS: Array<{
  id: "single" | "multi_same_region" | "multi_across_regions" | "multi_complex";
  value: ProgramLocationModel;
  label: string;
  helper: string;
}> = [
  {
    id: "single",
    value: "single",
    label: "Single Location",
    helper:
      "One site, one point of contact — the simplest structure to set up and the easiest to grow from later.",
  },
  {
    id: "multi_same_region",
    value: "multi_same_region",
    label: "Multiple Locations Same Region",
    helper:
      "A few sites close enough to share service windows and playbooks — coordination stays manageable when everyone's in the same area.",
  },
  {
    id: "multi_across_regions",
    value: "multi_across_regions",
    label: "Multiple Locations Across Regions",
    helper:
      "Sites spread across regions need stronger governance to stay consistent — we'll help you keep everything aligned.",
  },
  {
    id: "multi_complex",
    value: "multi_across_regions",
    label: "Multiple Locations, International or Complex",
    helper:
      "Complex or international footprints where centralized policy meets local execution — we'll make sure consistency holds regardless of geography.",
  },
];

const EXPOSURE_OPTIONS: Array<{
  value: ProgramExposureRisk;
  label: string;
  helper: string;
}> = [
  {
    value: "high_impact",
    label: "High Impact",
    helper:
      "Machine-adjacent and tool-heavy work where impact-rated frames aren't optional — they're the baseline.",
  },
  {
    value: "dust_debris",
    label: "Dust or Debris",
    helper:
      "Grinding, sanding, and cutting environments where airborne particles wear down lenses fast and interrupt visibility mid-shift.",
  },
  {
    value: "chemical_splash",
    label: "Chemical Splash",
    helper:
      "Chemical handling or lab work where fluid contact risk calls for splash-oriented designs, not standard safety frames.",
  },
  {
    value: "outdoor_glare",
    label: "Outdoor Glare",
    helper:
      "Extended outdoor exposure where glare isn't just annoying — it reduces hazard awareness and pushes people to take off their eyewear.",
  },
  {
    value: "fog_humidity",
    label: "Fog or Humidity",
    helper:
      "Cold storage, humid processing, or hot environments where fogging disrupts work and tempts people to remove their eyewear.",
  },
  {
    value: "indoor_outdoor_shift",
    label: "Indoor and Outdoor Shift Changes",
    helper:
      "Roles that move between inside and outside — dock to floor, office to field — where slow light adaptation creates a real safety gap.",
  },
  {
    value: "screen_intensive",
    label: "Screen Intensive Tasks",
    helper:
      "Extended screen work where visual fatigue builds over the shift and affects comfort, focus, and willingness to keep eyewear on.",
  },
  {
    value: "temperature_extremes",
    label: "Temperature Extremes",
    helper:
      "Foundry floors, cold storage, outdoor summers — temperature swings that stress lenses and make people want to ditch their eyewear.",
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
    helper: "How does your team currently get their safety eyewear?",
    options: [
      {
        value: "no_formal_program",
        label: "No Formal Program",
        helper:
          "Purchases happen as-needed with no standard process — the safety manager ends up fielding questions one by one.",
      },
      {
        value: "voucher",
        label: "Voucher / Reimbursement",
        helper:
          "There's a policy in place, but it only works when employees follow the steps correctly every time.",
      },
      {
        value: "vendor_optometry_partnership",
        label: "Vendor / Optometry Partnership",
        helper:
          "Eyewear runs through an existing vision benefit or optometry partner — coverage exists but may not be set up for safety compliance.",
      },
    ],
  },
  {
    id: "approval",
    title: "Approval Workflow",
    helper: "Does someone need to approve an order before it moves forward?",
    options: [
      {
        value: "approval_required",
        label: "Approval Required",
        helper:
          "Orders wait for a manager or safety reviewer before going through — adds control, but can slow things down.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery Method",
    helper: "How do your employees actually receive their eyewear today?",
    options: [
      {
        value: "employee_self_order",
        label: "Employee Self-Order",
        helper:
          "Employees order on their own through approved channels — fastest access, but needs strong guardrails to stay on-policy.",
      },
      {
        value: "onsite_events",
        label: "Onsite Events",
        helper:
          "Scheduled onsite visits where employees are fitted and ordered in person — better accuracy and stronger adoption.",
      },
      {
        value: "mail_fulfillment",
        label: "Online Ordering",
        helper:
          "Employees order online and receive directly — no site scheduling needed, but clear instructions and remake support are important.",
      },
      {
        value: "hybrid_delivery",
        label: "Hybrid",
        helper:
          "Onsite events for priority groups, online for everyone else — more to coordinate, but matches how your team actually works.",
      },
    ],
  },
  {
    id: "coverage_type",
    title: "Coverage Type",
    helper: "What kind of eyewear does your program need to cover?",
    options: [
      {
        value: "prescription_safety_eyewear",
        label: "Prescription Safety Eyewear",
        helper:
          "Custom safety eyewear for workers who need vision correction — the highest-adoption option because the glasses actually work for them.",
      },
      {
        value: "otg_non_prescription_eyewear",
        label: "Bulk Over the Glasses (OTG)",
        helper:
          "OTG frames worn over personal glasses — fast to deploy, but comfort and compliance tend to drop if the fit isn't dialed in.",
      },
      {
        value: "non_prescription_safety_eyewear",
        label: "Non Prescription Safety Eyewear",
        helper:
          "Standard safety frames for workers without vision correction needs — simple to manage, cost-effective, and easy to reorder.",
      },
      {
        value: "hybrid_eyewear",
        label: "Hybrid Model",
        helper:
          "Different pathways by role — prescription for some, non-prescription or OTG for others. More accurate coverage, a bit more to manage.",
      },
    ],
  },
];

const BUDGET_OPTIONS: Array<{
  value: ProgramBudgetPreference;
  label: string;
  bestFor: string;
  helper: string;
  impact: string;
}> = [
  {
    value: "super_strict",
    label: "Compliance First",
    bestFor: "New programs or tightening standards",
    helper:
      "Clear rules, defined eligibility, and predictable approvals — a solid foundation to build on.",
    impact: "Strong control with fewer exceptions.",
  },
  {
    value: "low_budget",
    label: "Operations Focused",
    bestFor: "Stable programs improving consistency",
    helper:
      "Keep what's already working and add reliability without extra admin.",
    impact: "Smoother day-to-day execution.",
  },
  {
    value: "good_budget",
    label: "Ready to Grow",
    bestFor: "Teams investing in adoption and fit",
    helper: "Better experience across shifts with fewer workarounds needed.",
    impact: "Higher wear rates and more consistent support.",
  },
  {
    value: "unlimited_budget",
    label: "Full Program Investment",
    bestFor: "Complex operations scaling across sites",
    helper: "Deep support and governance built to grow with you.",
    impact: "The most resilient structure for the long term.",
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
  const { draft, updateDraft } = useProgramDraft();

  const [initialStepIndex] = useState(() => consumeInitialStepIndex());
  const [form, setForm] = useState<RecommendationInputs>(() => ({
    ...DEFAULT_RECOMMENDATION_INPUTS,
  }));
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [hasSelectedWorkType, setHasSelectedWorkType] = useState(false);
  const [hasSelectedCoverageBand, setHasSelectedCoverageBand] = useState(false);
  const [framingDismissed, setFramingDismissed] = useState(false);
  const [locationOptionId, setLocationOptionId] = useState<
    "single" | "multi_same_region" | "multi_across_regions" | "multi_complex"
  >("single");
  const [showLocationDetails, setShowLocationDetails] = useState(false);
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
  const [mobileGuidanceOpen, setMobileGuidanceOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const setupSectionRefs = useRef<
    Record<CurrentSetupSectionId, HTMLElement | null>
  >({
    funding: null,
    approval: null,
    delivery: null,
    coverage_type: null,
  });

  const step = STEPS[stepIndex];
  const progress = clamp01(stepIndex / (STEPS.length - 1));
  const pillarAnchor = FOUR_PILLAR_BY_STEP[step.id];
  const shouldShowPreWizardFraming = stepIndex === 0 && !framingDismissed;

  const guidance = useMemo(() => {
    return buildGuidance({
      stepId: step.id,
      form,
      hasSelectedWorkType,
      hasSelectedCoverageBand,
      locationOptionId,
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
    hasSelectedCoverageBand,
    hasSelectedWorkType,
    locationOptionId,
    step.id,
  ]);

  function setField<K extends keyof RecommendationInputs>(
    key: K,
    value: RecommendationInputs[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectLocationOption(
    id:
      | "single"
      | "multi_same_region"
      | "multi_across_regions"
      | "multi_complex",
    value: ProgramLocationModel,
  ) {
    setLocationOptionId(id);
    setField("locationModel", value);
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

  function toggleExposureSelection(
    risk: ProgramExposureRisk,
    shouldFocus = true,
  ) {
    const selected = form.exposureRisks.includes(risk);
    const next = toggleMulti(form.exposureRisks, risk);
    setField("exposureRisks", next);
    if (shouldFocus) {
      setActiveExposureFocus(selected ? (next[next.length - 1] ?? null) : risk);
      setMobileGuidanceOpen(true);
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
    setMobileGuidanceOpen(true);
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
    const nextStepId = STEPS[clamped].id;
    setMobileGuidanceOpen(
      nextStepId === "exposures" || nextStepId === "current_setup",
    );
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
    // Seed initial state so back from step 1 → step 0 works
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
    if (step.id === "company") {
      if (!form.contactName.trim() || !form.companyName.trim()) {
        setError("Please add your full name and company before continuing.");
        return;
      }
      if (!isValidEmailFormat(form.email)) {
        setError(
          "Your email is how we send your recommendation and connect you with a specialist — without it, we can't make this useful.",
        );
        return;
      }
    }
    goToStep(stepIndex + 1);
  }

  function goBack() {
    goToStep(stepIndex - 1);
  }

  function onComplete() {
    setError("");
    try {
      const { draftPatch } = buildProgramRecommendation(form);
      updateDraft((prev) => ({
        ...draftPatch,
        programConfig: {
          active: draftPatch.programConfig?.active,
          manualDraftSnapshot: prev,
        },
      }));
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
    work_type: "/images/step-02-work-type.jpg",
    coverage: "/images/step-03-team-size.jpg",
    locations: "/images/step-04-locations.jpg",
    exposures: "/images/step-05-exposures.jpg",
    current_setup: "/images/step-06-current-setup.jpg",
    budget: "/images/step-07-program-posture.jpg",
  };

  const stepImage = STEP_IMAGES[step.id];

  return (
    <section aria-labelledby="recommendation-title">
      <PageHero
        id="recommendation-title"
        title={step.heroTitle}
        subtitle={step.heroSubtitle}
      />

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-0">
        <SectionWrap>
          {/* ── Progress bar + step nav ── */}
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
                <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/80 bg-background text-primary"
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
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-wide sm:grid-cols-4 lg:grid-cols-7">
              {STEPS.map((item, idx) => {
                const active = idx === stepIndex;
                const complete = idx < stepIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToStep(idx)}
                    aria-current={active ? "step" : undefined}
                    className={`rounded-md border px-2 py-1.5 text-center leading-snug transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : complete
                          ? "border-primary/40 bg-primary/5 text-primary/80"
                          : "border-border bg-card text-muted-foreground hover:border-ring hover:bg-secondary/50"
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

          {error ? (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              {shouldShowPreWizardFraming ? (
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <img
                    src="/images/intro-program-builder.jpg"
                    alt="Program specialist reviewing a safety eyewear plan with a team"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-5">
                    <p className="text-base font-bold text-foreground">
                      Let's build your program recommendation — it only takes
                      about five minutes.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      We'll walk through seven steps covering your team, your
                      environment, and how things run today. From there, we'll
                      put together a tailored recommendation and connect you
                      with an OSSO specialist to review it together.
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                      <span aria-hidden="true">✦</span>
                      No commitments — this is just a starting point we'll
                      refine together.
                    </p>
                  </div>
                </div>
              ) : null}

              {step.id === "company" ? (
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      A little about you
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">
                          Your Name
                        </div>
                        <input
                          value={form.contactName}
                          onChange={(e) =>
                            setField("contactName", e.target.value)
                          }
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="Full name"
                          aria-label="Full name"
                          required
                        />
                      </label>

                      <label className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">
                          Company
                        </div>
                        <input
                          value={form.companyName}
                          onChange={(e) =>
                            setField("companyName", e.target.value)
                          }
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="Company"
                          aria-label="Company"
                          required
                        />
                      </label>

                      <label className="space-y-2 sm:col-span-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Your Role
                        </div>
                        <input
                          value={form.contactRole}
                          onChange={(e) =>
                            setField("contactRole", e.target.value)
                          }
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="Safety Manager, EHS Director, etc."
                          aria-label="Your role"
                        />
                      </label>

                      <label className="space-y-2 sm:col-span-2">
                        <div className="text-sm font-semibold text-foreground">
                          Email
                        </div>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="name@company.com"
                          aria-label="Email"
                          required
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Phone (optional)
                      </div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setField("phone", formatPhoneAsUs(e.target.value))
                        }
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="123-456-7890"
                        aria-label="Phone"
                      />
                    </label>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => setShowLocationDetails((prev) => !prev)}
                        className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-ring hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        aria-expanded={showLocationDetails}
                        aria-controls="location-details-fields"
                      >
                        {showLocationDetails
                          ? "Hide location details"
                          : "Add location details"}
                      </button>
                    </div>

                    {showLocationDetails ? (
                      <div
                        id="location-details-fields"
                        className="grid gap-4 sm:col-span-2 sm:grid-cols-2"
                      >
                        <label className="space-y-2 sm:col-span-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            Street
                          </div>
                          <input
                            value={form.address1}
                            onChange={(e) =>
                              setField("address1", e.target.value)
                            }
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="Street address"
                            aria-label="Street"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            City
                          </div>
                          <input
                            value={form.city}
                            onChange={(e) => setField("city", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="City"
                            aria-label="City"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            State
                          </div>
                          <input
                            value={form.state}
                            onChange={(e) => setField("state", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="State"
                            aria-label="State"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            ZIP
                          </div>
                          <input
                            value={form.zip}
                            onChange={(e) => setField("zip", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="ZIP"
                            aria-label="ZIP"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step.id === "work_type" ? (
                <div className="space-y-3">
                  <div className="grid gap-3">
                    {WORK_TYPE_OPTIONS.map((opt) => {
                      const selected = form.workType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={cardClass(selected)}
                          onClick={() => {
                            setHasSelectedWorkType(true);
                            setField("workType", opt.value);
                          }}
                        >
                          <div className="absolute right-3 top-3">
                            {selected ? selectedBadge() : null}
                          </div>
                          <div className="pr-10 text-sm font-semibold text-foreground">
                            {opt.label}
                          </div>
                          <div className="mt-1 pr-10 text-xs text-muted-foreground">
                            {opt.helper}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Not seeing your environment? Specialized / Mixed covers
                    custom exposure profiles and edge cases.
                  </p>
                </div>
              ) : null}

              {step.id === "coverage" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {COVERAGE_BANDS.map((opt) => {
                    const selected = form.coverageSizeBand === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={cardClass(selected)}
                        onClick={() => {
                          setHasSelectedCoverageBand(true);
                          setField("coverageSizeBand", opt.value);
                        }}
                      >
                        <div className="absolute right-3 top-3">
                          {selected ? selectedBadge() : null}
                        </div>
                        <div className="pr-10 text-sm font-semibold text-foreground">
                          {opt.label}
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          {opt.helper}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "locations" ? (
                <div className="grid gap-3">
                  {LOCATION_MODELS.map((opt) => {
                    const selected = locationOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={cardClass(selected)}
                        onClick={() => selectLocationOption(opt.id, opt.value)}
                      >
                        <div className="absolute right-3 top-3">
                          {selected ? selectedBadge() : null}
                        </div>
                        <div className="pr-10 text-sm font-semibold text-foreground">
                          {opt.label}
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          {opt.helper}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "exposures" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {EXPOSURE_OPTIONS.map((opt, idx) => {
                    const selected = form.exposureRisks.includes(opt.value);
                    const focused = activeExposureFocus === opt.value;
                    const isFinalOddCard =
                      EXPOSURE_OPTIONS.length % 2 === 1 &&
                      idx === EXPOSURE_OPTIONS.length - 1;
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
                        onClick={() => toggleExposureSelection(opt.value)}
                        onFocus={() => setActiveExposureFocus(opt.value)}
                        onMouseEnter={() => setActiveExposureFocus(opt.value)}
                        onMouseLeave={() => {
                          setActiveExposureFocus((prev) =>
                            prev === opt.value ? null : prev,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExposureSelection(opt.value);
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
              ) : null}

              {step.id === "current_setup" ? (
                <div className="space-y-6">
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
                </div>
              ) : null}

              {step.id === "budget" ? (
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
                        <div className="mt-2 pr-10 text-xs font-medium text-foreground">
                          Best for: {opt.bestFor}
                        </div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">
                          {opt.helper}
                        </div>
                        <div className="mt-2 pr-10 text-xs text-foreground/80">
                          {opt.impact}
                        </div>
                      </button>
                    );
                  })}
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

            <aside className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-6 space-y-4">
                <div className="overflow-hidden rounded-xl border border-border bg-[#f0f4fb]">
                  <img
                    src={stepImage}
                    alt="Program guidance visual"
                    className="aspect-[16/9] w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* ── Advisory guidance panel ── */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="text-sm font-semibold text-foreground">
                    Advisory Guidance
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {step.id === "budget"
                      ? "This helps us tailor the depth and structure of your recommendation."
                      : "We'll update this as you go — pick an option to see more detail."}
                  </div>
                  {guidance.selectedLabel ? (
                    <div className="mt-3">
                      <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {guidance.selectedLabel}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                    {guidance.sections.map((section) => (
                      <section key={section.title}>
                        <h3 className="text-sm font-semibold text-foreground">
                          {section.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {section.body}
                        </p>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div
            className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
            data-pdf-exclude="true"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <button
                type="button"
                onClick={() => setMobileGuidanceOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={mobileGuidanceOpen}
                aria-controls="mobile-program-guidance"
                aria-label="Program guidance drawer"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Helpful Context
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tap to{" "}
                    {mobileGuidanceOpen ? "minimize" : "see why this matters"}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {mobileGuidanceOpen ? "Close" : "Why?"}
                </span>
              </button>

              {mobileGuidanceOpen ? (
                <div
                  id="mobile-program-guidance"
                  className="max-h-[70vh] space-y-4 overflow-y-auto border-t border-border p-4 text-sm text-muted-foreground"
                >
                  {guidance.selectedLabel ? (
                    <div>
                      <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {guidance.selectedLabel}
                      </span>
                    </div>
                  ) : null}
                  {guidance.sections.map((section) => (
                    <section key={section.title}>
                      <h3 className="text-sm font-semibold text-foreground">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {section.body}
                      </p>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {draft.programConfig?.active ? (
            <div className="mt-8 rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
              Your recommendation is saved for this session. You can come back
              and regenerate it anytime.
            </div>
          ) : null}
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
  hasSelectedWorkType: boolean;
  hasSelectedCoverageBand: boolean;
  locationOptionId:
    | "single"
    | "multi_same_region"
    | "multi_across_regions"
    | "multi_complex";
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
          title: "Your contact information",
          body: "We use your name and company to personalize your recommendation and make sure your specialist has the right person to follow up with. This is just standard contact info — nothing else is tied to it at this stage.",
        },
        {
          title: "Why this matters",
          body: "Having a clear point of contact from the start means your specialist can reach out directly, your recommendation is addressed properly, and there's no back-and-forth figuring out who to talk to.",
        },
      ),
    };
  }

  if (stepId === "work_type") {
    if (!args.hasSelectedWorkType) {
      return {
        selectedLabel: null,
        sections: guidanceSections({
          title: "What this step is deciding",
          body: "The selection you make here shapes the structure, features, and service depth of your recommendation. There's no wrong answer. The more accurate you are, the more useful the output.",
        }),
      };
    }
    const content = workTypeExplainer(form.workType);
    const selected =
      WORK_TYPE_OPTIONS.find((option) => option.value === form.workType)
        ?.label ?? null;
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "What this environment typically needs", body: content.needs },
        { title: "What makes programs work here", body: content.pattern },
      ),
    };
  }

  if (stepId === "coverage") {
    if (!args.hasSelectedCoverageBand) {
      return {
        selectedLabel: null,
        sections: guidanceSections({
          title: "What this step covers",
          body: "Team size helps us recommend the right program structure and service level. Just pick the range that's closest.",
        }),
      };
    }
    const band = form.coverageSizeBand ?? "31_60";
    const selected =
      COVERAGE_BANDS.find((option) => option.value === band)?.label ?? null;
    const map: Record<
      string,
      { reality: string; coordination: string; nextBand: string }
    > = {
      "1_30": {
        reality:
          "At this headcount, coverage is usually coordinated directly between one program owner and frontline supervisors, so schedule changes are handled in real time.",
        coordination:
          "Coordination load typically sits with the safety lead who is simultaneously validating eligibility, answering employee questions, and tracking replacements manually.",
        nextBand:
          "Crossing into 31 to 60 introduces recurring onboarding volume, so you usually need a standard intake rhythm instead of one-by-one ordering.",
      },
      "31_60": {
        reality:
          "With 31 to 60 employees, shift overlap starts to matter and onboarding groups begin to compete with replacement needs in the same weekly schedule.",
        coordination:
          "Friction usually concentrates on the person maintaining eligibility lists and processing replacement requests by hand before tooling catches up.",
        nextBand:
          "At 61 to 100, grouped onboarding events become more efficient than individual ordering, and reporting cadence needs to be designed instead of handled reactively.",
      },
      "61_100": {
        reality:
          "At this size, multiple supervisors feed requests into the program at once, so missed handoffs become the main source of delays.",
        coordination:
          "Coordination pressure often falls on the safety coordinator who must reconcile manager requests with approval status and delivery timing.",
        nextBand:
          "Moving to 101 to 250 usually requires explicit response-time targets and a formal exception path so bottlenecks do not spread across teams.",
      },
      "101_250": {
        reality:
          "Programs in this band are operating across several teams or sites, which means scheduling now depends on shared calendars rather than informal coordination.",
        coordination:
          "The heaviest friction usually appears in approval routing, where requests stall between local managers and central safety reviewers.",
        nextBand:
          "At 251 to 500, site-level execution owners become necessary, and centralized reporting has to run on a fixed cadence to stay trustworthy.",
      },
      "251_500": {
        reality:
          "At this scale, coverage is continuous work: onboarding, reorders, and exceptions are all happening at the same time across many managers.",
        coordination:
          "Coordination load typically concentrates in whoever governs cross-site standards and resolves policy conflicts between local operating practices.",
        nextBand:
          "Crossing 500+ shifts the program into enterprise governance, where specialist support, formal controls, and executive reporting become non-optional.",
      },
      "500_plus": {
        reality:
          "At 500+, scheduling and fulfillment run as enterprise operations with parallel workflows across sites, shifts, and role families.",
        coordination:
          "Friction concentrates at the governance layer, especially in policy harmonization, audit evidence management, and enterprise escalation handling.",
        nextBand:
          "You are already at enterprise scale; the next shift is deeper specialist engagement for architecture reviews, regional governance, and continuous optimization.",
      },
    };
    const copy = map[band] ?? map["31_60"];
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "What this size means for your team", body: copy.reality },
        {
          title: "Where the coordination load actually falls",
          body: copy.coordination,
        },
        {
          title: "What shifts when you move to the next band",
          body: copy.nextBand,
        },
      ),
    };
  }

  if (stepId === "locations") {
    const selected =
      LOCATION_MODELS.find((option) => option.id === args.locationOptionId)
        ?.label ?? null;
    const map: Record<
      "single" | "multi_same_region" | "multi_across_regions" | "multi_complex",
      { easier: string; change: string }
    > = {
      single: {
        easier:
          "A single-site model keeps operations simple: one approval path, one delivery cadence, one exception contact, and no need for cross-region scheduling logic.",
        change:
          "When you add a second site, you introduce routing decisions, a second cadence to manage, and usually a review of whether approval ownership should split.",
      },
      multi_same_region: {
        easier:
          "Same-region multi-site programs simplify service by sharing travel windows, standardizing playbooks, and reusing one regional escalation path.",
        change:
          "If sites spread beyond the region, timezone and carrier variability force you to redesign scheduling windows and tighten handoff rules.",
      },
      multi_across_regions: {
        easier:
          "Across-region structure makes it easier to localize scheduling by region while keeping one governance standard for approvals and reporting.",
        change:
          "International expansion adds compliance documentation requirements and routing complexity that usually triggers a full program-structure review.",
      },
      multi_complex: {
        easier:
          "International or complex networks make it possible to run tiered governance, with central policy control and local execution tuned to legal and operational constraints.",
        change:
          "If complexity increases through acquisitions or new countries, program ownership, documentation, and fulfillment routing usually need dedicated specialist redesign.",
      },
    };
    const copy = map[args.locationOptionId];
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "What this structure makes easier", body: copy.easier },
        { title: "What to think about when this changes", body: copy.change },
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
          title: "How OSSO applies this to the recommendation",
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
            title: "Tell us where your program stands today",
            body: "This is about your current operational reality, not your ideal state. The posture you select helps us match the right package depth and service structure to where you actually are. Be honest here - the recommendation is only useful if it is built on where you are starting from.",
          },
          {
            title: "How this fits into your recommendation",
            body: "Your posture sets the level of structure, service depth, and governance support that makes sense for where you are right now.",
          },
          {
            title: "What changes at each posture",
            body: "These four options change product depth, service cadence, and support structure. Compliance First produces a leaner, more controlled recommendation. Full Program Investment is built for complexity and long-term resilience. Pick the one that reflects where you are today — your specialist will fine-tune from there.",
          },
        ),
      };
    }
    const selectedBudget = form.budgetPreference;
    const copy = budgetPreferenceExplainer(selectedBudget);
    return {
      selectedLabel: budgetPreferenceLabel(selectedBudget),
      sections: guidanceSections(
        { title: "How this changes your operating model", body: copy.impact },
        {
          title: "How this affects the recommendation",
          body: copy.recommendation,
        },
        { title: "Who this path is best for", body: copy.bestFor },
      ),
    };
  }

  const isSetupCollapsedDefault = Object.values(
    args.collapsedSetupSections,
  ).every(Boolean);
  if (isSetupCollapsedDefault) {
    return {
      selectedLabel: null,
      sections: guidanceSections(
        {
          title: "What this step covers",
          body: "Steps 1 through 5 described your environment — who, how many, where, and what hazards. This step defines how your program actually runs day to day: how employees access eyewear, how orders get approved, and whether things hold together without someone managing it all manually.",
        },
        {
          title: "Why your specialist pays close attention here",
          body: "These choices determine service cadence, admin load, and how well the structure holds up as your team grows. Getting these right is what separates a program that runs smoothly from one that creates more work than it solves.",
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
            body: "Coverage type determines whether employees are routed through prescription, non-prescription, OTG, or hybrid pathways.",
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
    outdoor_glare: "Outdoor Glare",
    fog_humidity: "Fog or Humidity",
    indoor_outdoor_shift: "Indoor and Outdoor Shift Changes",
    screen_intensive: "Screen Intensive Tasks",
    temperature_extremes: "Temperature Extremes",
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
    reimbursement: "Vendor / Optometry Partnership",
    vendor_optometry_partnership: "Vendor / Optometry Partnership",
    voucher: "Voucher / Reimbursement",
    employer_fully_covered: "Employer Fully Covered",
    employer_base_with_upgrades: "Employer Base with Upgrades",
    approval_required: "Approval Required",
    manager_approval_required: "Approval Required",
    centralized_safety_approval: "Centralized Safety Approval",
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
    vendor_optometry_partnership: {
      structure:
        "Safety eyewear is routed through a partner vendor or optometry network tied to vision benefits coverage.",
      compliance:
        "Compliance improves when partner catalogs and eligibility rules are aligned to approved safety standards.",
      admin:
        "Switching from an existing partner is a real operational step. Your specialist will walk through what that transition looks like and what stays the same.",
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
    approval_required: {
      structure:
        "Orders and exceptions route through a required approval checkpoint before fulfillment.",
      compliance:
        "This adds control over policy adherence and reduces unapproved ordering paths.",
      admin:
        "Queue ownership and turnaround targets matter a lot here — undefined approval chains are where fulfillment quietly becomes unpredictable.",
    },
    manager_approval_required: {
      structure:
        "Orders and exceptions route through a required approval checkpoint before fulfillment.",
      compliance:
        "This adds control over policy adherence and reduces unapproved ordering paths.",
      admin:
        "Queue ownership and turnaround targets matter a lot here — undefined approval chains are where fulfillment quietly becomes unpredictable.",
    },
    centralized_safety_approval: {
      structure:
        "A centralized safety team owns approvals, standards, and exception decisions across the organization.",
      compliance:
        "This model supports stronger consistency, cleaner documentation, and stronger audit consistency.",
      admin:
        "Admin workload is concentrated centrally, but process quality and decision clarity are usually higher.",
    },
    onsite_events: {
      structure:
        "Employees get fitted and ordered in a controlled, supervised setting — the highest-accuracy delivery model because OSSO is there.",
      compliance:
        "Supervised selection and fitting improve compliance, accuracy, and policy alignment at order time.",
      admin:
        "Scheduling effort increases upfront, but downstream order corrections and support tickets are reduced.",
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
        "Program combines prescription safety eyewear, non-prescription options, and OTG pathways by role.",
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
    super_strict: "Compliance First",
    low_budget: "Operations Focused",
    good_budget: "Ready to Grow",
    unlimited_budget: "Full Program Investment",
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
        "Program structure stays focused on clear standards, defined eligibility, and predictable compliance execution.",
      recommendation:
        "Recommendation leans toward structurally sound package depth with tightly controlled complexity.",
      bestFor:
        "Best for new programs or teams tightening a loose setup before scaling.",
    },
    low_budget: {
      impact:
        "Program design emphasizes reliable day-to-day operations without unnecessary process overhead.",
      recommendation:
        "Recommendation balances consistency and service support so execution stays steady across normal demand.",
      bestFor:
        "Best for established programs managing consistent coverage and predictable workflows.",
    },
    good_budget: {
      impact:
        "Program can support stronger adoption, better employee experience, and cleaner consistency across teams — the gap between what's issued and what's worn starts closing here.",
      recommendation:
        "Recommendation steps up depth to reduce exceptions and improve consistency as operations expand.",
      bestFor:
        "Best for teams that are actively growing and ready to invest in stronger consistency.",
    },
    unlimited_budget: {
      impact:
        "Program can prioritize full support depth, enterprise scalability, and long-term operational resilience.",
      recommendation:
        "Recommendation can move to maximum package and service depth where complexity and scale justify it.",
      bestFor:
        "Best for large or highly complex programs optimizing for full performance and support.",
    },
  };
  return map[value];
}
