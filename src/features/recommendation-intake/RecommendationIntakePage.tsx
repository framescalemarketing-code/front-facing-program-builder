"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { formatPhoneAsUs } from "@/lib/contactValidation";
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
  progressLabel: string;
};

type GuidanceSection = {
  title: string;
  body: string;
};

type GuidanceContent = {
  selectedLabel: string | null;
  sections: [GuidanceSection, GuidanceSection, GuidanceSection, GuidanceSection];
};

const STEPS: WizardStep[] = [
  {
    id: "company",
    sectionLabel: "Contact",
    heroTitle: "Let's start with your team",
    progressLabel: "Contact",
  },
  {
    id: "work_type",
    sectionLabel: "Work Type",
    heroTitle: "What kind of work does your workforce do?",
    progressLabel: "Work Type",
  },
  {
    id: "coverage",
    sectionLabel: "Team Size",
    heroTitle: "How should coverage be structured?",
    progressLabel: "Team Size",
  },
  {
    id: "locations",
    sectionLabel: "Locations",
    heroTitle: "Where will service be delivered?",
    progressLabel: "Locations",
  },
  {
    id: "exposures",
    sectionLabel: "Exposures",
    heroTitle: "What hazards are your workers exposed to?",
    progressLabel: "Exposures",
  },
  {
    id: "current_setup",
    sectionLabel: "Setup",
    heroTitle: "How should this program be set up?",
    progressLabel: "Setup",
  },
  {
    id: "budget",
    sectionLabel: "Direction",
    heroTitle: "Choose your direction",
    progressLabel: "Direction",
  },
];

const FOUR_PILLAR_BY_STEP: Record<StepId, { icon: string; phrase: string }> = {
  company: { icon: "FT", phrase: "Follow Through as a Feature" },
  work_type: { icon: "HF", phrase: "Human First Safety" },
  coverage: { icon: "RD", phrase: "Reliability by Design" },
  locations: { icon: "RD", phrase: "Reliability by Design" },
  exposures: { icon: "HF", phrase: "Human First Safety" },
  current_setup: { icon: "FT", phrase: "Follow Through as a Feature" },
  budget: { icon: "SS", phrase: "Structured Scale" },
};

const SETUP_SECTION_BADGES: Record<CurrentSetupSectionId, string> = {
  funding: "6A",
  approval: "6B",
  delivery: "6C",
  coverage_type: "6D",
};

const EMPTY_GUIDANCE_MESSAGE = "Select an option to see how it shapes your program.";
const RECOMMENDATION_START_STEP_KEY = "osso_recommendation_start_step";

const WORK_TYPE_OPTIONS: Array<{ value: ProgramWorkType; label: string; helper: string }> = [
  {
    value: "manufacturing",
    label: "Manufacturing Safety",
    helper: "Production floors, shift operations, and machine-adjacent roles needing consistent fit and durable protection.",
  },
  {
    value: "construction",
    label: "Construction Safety",
    helper: "Dynamic field environments with impact risk, debris exposure, and changing outdoor light conditions.",
  },
  {
    value: "utilities",
    label: "Utilities Safety",
    helper: "Service teams working across regions with variable weather, visibility demands, and compliance documentation needs.",
  },
  {
    value: "warehouse",
    label: "Warehouse Safety",
    helper: "Distribution operations with forklifts, pick lines, and high repetition tasks requiring dependable daily wear.",
  },
  {
    value: "healthcare",
    label: "Healthcare Safety",
    helper: "Clinical and support workflows where comfort, clarity, and cleaning compatibility influence consistent usage.",
  },
  {
    value: "public_sector",
    label: "Public Sector Safety",
    helper: "Multi-department programs with governance standards and role-specific compliance expectations.",
  },
  {
    value: "laboratory",
    label: "Laboratory Safety",
    helper: "Controlled environments with splash and fog considerations that require strict protection consistency.",
  },
  {
    value: "other",
    label: "Other Safety Environment",
    helper: "Mixed or specialized conditions not covered above, with custom policy and coverage requirements.",
  },
];

const COVERAGE_BANDS: Array<{ value: RecommendationInputs["coverageSizeBand"]; label: string; helper: string }> = [
  { value: "1_30", label: "1 to 30", helper: "Early-stage rollout with direct communication and fast policy alignment." },
  { value: "31_60", label: "31 to 60", helper: "Growing program volume where scheduling discipline and repeatable intake start to matter." },
  { value: "61_100", label: "61 to 100", helper: "Multi-team onboarding requiring stronger coordination, reporting rhythm, and exception handling." },
  { value: "101_250", label: "101 to 250", helper: "Higher operational load with formal approvals, standardized rules, and tighter administration." },
  { value: "251_500", label: "251 to 500", helper: "Distributed workforce needing role-based controls, scalable support, and governance consistency." },
  { value: "500_plus", label: "500+", helper: "Enterprise-scale complexity requiring mature workflows, visibility, and cross-site program management." },
];

const LOCATION_MODELS: Array<{ id: "single" | "multi_same_region" | "multi_across_regions" | "multi_complex"; value: ProgramLocationModel; label: string; helper: string }> = [
  { id: "single", value: "single", label: "Single Location", helper: "Centralized rollout with straightforward scheduling, approvals, and service execution." },
  { id: "multi_same_region", value: "multi_same_region", label: "Multiple Locations Same Region", helper: "Regional coordination model with repeatable site scheduling and shared playbooks." },
  { id: "multi_across_regions", value: "multi_across_regions", label: "Multiple Locations Across Regions", helper: "Distributed program model requiring strong governance, routing, and communication structure." },
  {
    id: "multi_complex",
    value: "multi_across_regions",
    label: "Multiple Locations, International or Complex",
    helper: "Complex, international, or mixed-location operations that need centralized routing and policy consistency.",
  },
];

const EXPOSURE_OPTIONS: Array<{ value: ProgramExposureRisk; label: string; helper: string }> = [
  { value: "high_impact", label: "High Impact", helper: "Tool-heavy or machine-adjacent work where impact resistance and secure retention are essential." },
  { value: "dust_debris", label: "Dust or Debris", helper: "Particulate-heavy environments that increase lens wear and visibility disruption over time." },
  { value: "chemical_splash", label: "Chemical Splash", helper: "Fluid or irritant exposure requiring stronger splash-oriented protection standards." },
  { value: "outdoor_glare", label: "Outdoor Glare", helper: "Bright outdoor conditions where glare reduction improves safety, comfort, and consistent wear." },
  { value: "fog_humidity", label: "Fog or Humidity", helper: "Humidity and temperature shifts that can interrupt visibility and workflow continuity." },
  { value: "indoor_outdoor_shift", label: "Indoor and Outdoor Shift Changes", helper: "Frequent movement across lighting zones that demands faster visual adaptation." },
  { value: "screen_intensive", label: "Screen Intensive Tasks", helper: "Extended digital viewing that can increase visual fatigue and reduce comfort." },
];

type CurrentSetupSectionId = "funding" | "approval" | "delivery" | "coverage_type";

const CURRENT_SETUP_SECTIONS: Array<{
  id: CurrentSetupSectionId;
  title: string;
  helper: string;
  options: Array<{ value: CurrentSafetySetup; label: string; helper: string }>;
}> = [
  {
    id: "funding",
    title: "Safety Program",
    helper: "Select the core safety-program structure used by your organization.",
    options: [
      { value: "no_formal_program", label: "No Formal Program", helper: "Ad hoc purchasing with limited policy control, tracking, and reporting visibility." },
      {
        value: "voucher",
        label: "Voucher / Reimbursement System",
        helper: "Employees use a defined voucher or reimbursement process through approved ordering channels.",
      },
      {
        value: "vendor_optometry_partnership",
        label: "Vendor / Optometry Partnership",
        helper: "Safety eyewear is provided through an existing vision-insurance or partner optometry network.",
      },
    ],
  },
  {
    id: "approval",
    title: "Approval Workflow",
    helper: "Select whether orders require an approval checkpoint before fulfillment.",
    options: [
      {
        value: "approval_required",
        label: "Approval Required",
        helper: "Orders route through a manager or safety reviewer before release.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery Method",
    helper: "Select how employees access and order eyewear.",
    options: [
      { value: "employee_self_order", label: "Employee Self-Order", helper: "Employees place and manage their own orders through approved vendors." },
      { value: "onsite_events", label: "Onsite Events", helper: "Scheduled onsite fittings and ordering for higher participation and controlled execution." },
      { value: "mail_fulfillment", label: "Online Ordering", helper: "Employees order through an online workflow with direct fulfillment support." },
      { value: "hybrid_delivery", label: "Hybrid", helper: "Blended delivery model combining onsite support with remote fulfillment channels." },
    ],
  },
  {
    id: "coverage_type",
    title: "Coverage Type",
    helper: "Select whether coverage is prescription, over-glasses non prescription, or hybrid.",
    options: [
      {
        value: "prescription_safety_eyewear",
        label: "Prescription Safety Eyewear",
        helper: "Employees are fitted for prescription safety eyewear as their primary compliance option.",
      },
      {
        value: "otg_non_prescription_eyewear",
        label: "Bulk Over the Glasses",
        helper: "OTG safety eyewear is issued in bulk for use over personal prescription glasses.",
      },
      {
        value: "non_prescription_safety_eyewear",
        label: "Non-Prescription Safety Eyewear",
        helper: "Non-prescription safety eyewear is provided as the primary compliance option.",
      },
      {
        value: "hybrid_eyewear",
        label: "Hybrid Model",
        helper: "Program combines prescription, non-prescription, and OTG pathways based on role and job conditions.",
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
    label: "Foundational Standardization",
    bestFor: "New programs or compliance first rollouts",
    helper: "We need a tightly standardized baseline focused on core compliance and consistent execution.",
    impact: "Focuses recommendation on dependable baseline coverage with limited complexity.",
  },
  {
    value: "low_budget",
    label: "Steady Operations",
    bestFor: "Established programs managing steady headcount",
    helper: "We want stable day-to-day execution with practical flexibility for field realities.",
    impact: "Balances consistency and support while keeping operations manageable.",
  },
  {
    value: "good_budget",
    label: "Balanced Growth",
    bestFor: "Programs scaling across teams or locations",
    helper: "We want to improve adoption and consistency with a stronger operational support model.",
    impact: "Maintains a strong mix of service reliability, employee experience, and control.",
  },
  {
    value: "unlimited_budget",
    label: "Maximum Coverage",
    bestFor: "Large, multi site, or high complexity operations",
    helper: "We want the strongest long-term program resilience across teams and locations.",
    impact: "Prioritizes scalability, premium support pathways, and stronger service depth.",
  },
];

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toggleMulti<T extends string>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function cardClass(selected: boolean) {
  return `relative w-full rounded-md border border-border bg-card p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
    selected
      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25"
      : "hover:border-ring hover:bg-secondary/50"
  }`;
}

function exposureCardClass(focused: boolean, selected: boolean, compact = false) {
  const densityClass = compact ? "p-3" : "p-4";
  const focusClass = "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
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
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
        <path d="M3.5 8.25L6.75 11.5L12.5 5.75" />
      </svg>
    </span>
  );
}

function setupSectionForItem(item: CurrentSafetySetup) {
  return CURRENT_SETUP_SECTIONS.find((section) => section.options.some((option) => option.value === item)) ?? null;
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

export function RecommendationIntakePage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft, updateDraft } = useProgramDraft();

  const [form, setForm] = useState<RecommendationInputs>(() => ({ ...DEFAULT_RECOMMENDATION_INPUTS }));
  const [stepIndex, setStepIndex] = useState(() => consumeInitialStepIndex());
  const [locationOptionId, setLocationOptionId] = useState<"single" | "multi_same_region" | "multi_across_regions" | "multi_complex">("single");
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [activeExposureFocus, setActiveExposureFocus] = useState<ProgramExposureRisk | null>(null);
  const [activeSetupFocus, setActiveSetupFocus] = useState<CurrentSafetySetup | null>(null);
  const [activeSetupSection, setActiveSetupSection] = useState<CurrentSetupSectionId>("funding");
  const [collapsedSetupSections, setCollapsedSetupSections] = useState<Record<CurrentSetupSectionId, boolean>>({
    funding: false,
    approval: false,
    delivery: false,
    coverage_type: false,
  });
  const [mobileGuidanceOpen, setMobileGuidanceOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const setupSectionRefs = useRef<Record<CurrentSetupSectionId, HTMLElement | null>>({
    funding: null,
    approval: null,
    delivery: null,
    coverage_type: null,
  });

  const step = STEPS[stepIndex];
  const progress = clamp01(stepIndex / (STEPS.length - 1));
  const pillarAnchor = FOUR_PILLAR_BY_STEP[step.id];

  const guidance = useMemo(() => {
    return buildGuidance({
      stepId: step.id,
      form,
      locationOptionId,
      activeExposureFocus,
      activeSetupFocus,
      activeSetupSection,
    });
  }, [activeExposureFocus, activeSetupFocus, activeSetupSection, form, locationOptionId, step.id]);

  function setField<K extends keyof RecommendationInputs>(key: K, value: RecommendationInputs[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectLocationOption(id: "single" | "multi_same_region" | "multi_across_regions" | "multi_complex", value: ProgramLocationModel) {
    setLocationOptionId(id);
    setField("locationModel", value);
  }

  function setSetupFocus(item: CurrentSafetySetup | null) {
    setActiveSetupFocus(item);
    if (!item) return;
    const section = setupSectionForItem(item);
    if (section) {
      setActiveSetupSection(section.id);
    }
  }

  function toggleExposureSelection(risk: ProgramExposureRisk, shouldFocus = true) {
    const selected = form.exposureRisks.includes(risk);
    const next = toggleMulti(form.exposureRisks, risk);
    setField("exposureRisks", next);
    if (shouldFocus) {
      setActiveExposureFocus(selected ? next[next.length - 1] ?? null : risk);
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
    const next = [...form.currentSafetySetup.filter((v) => !sectionValues.includes(v)), item];
    setField("currentSafetySetup", next);
    setActiveSetupSection(section.id);
    setSetupFocus(item);
    setMobileGuidanceOpen(true);
  }

  function toggleSetupSection(sectionId: CurrentSetupSectionId) {
    setCollapsedSetupSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
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
          if (!topEntry || entry.intersectionRatio > topEntry.intersectionRatio) {
            topEntry = entry;
          }
        }
        if (!topEntry) return;
        const sectionId = (topEntry.target as HTMLElement).dataset.setupSection as CurrentSetupSectionId | undefined;
        if (!sectionId) return;
        setActiveSetupSection(sectionId);
      },
      {
        root: null,
        rootMargin: "-25% 0px -50% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );

    for (const sectionId of Object.keys(refs) as CurrentSetupSectionId[]) {
      const node = refs[sectionId];
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [step.id, collapsedSetupSections]);

  function goToStep(nextIndex: number) {
    setError("");
    const clamped = Math.max(0, Math.min(nextIndex, STEPS.length - 1));
    setStepIndex(clamped);
    const nextStepId = STEPS[clamped].id;
    setMobileGuidanceOpen(nextStepId === "exposures" || nextStepId === "current_setup");
  }

  function goNext() {
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
      const message = e instanceof Error ? e.message : "Unable to generate recommendation.";
      setError(message);
    }
  }

  return (
    <section aria-labelledby="recommendation-title">
      <PageHero
        id="recommendation-title"
        title={step.heroTitle}
        subtitle={`Program Recommendation - ${step.sectionLabel}`}
      />

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-0">
        <SectionWrap>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className={secondaryButtonClass}
            >
              Back
            </button>
            <div className="text-sm font-semibold text-foreground">{stepProgressLabel(stepIndex)}</div>
          </div>

          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-4 lg:grid-cols-7">
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
                          : "border-border bg-card hover:border-ring hover:bg-secondary/50"
                    }`}
                  >
                    {item.progressLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="font-semibold text-primary">
              {pillarAnchor.icon}
            </span>
            <span className="font-medium text-foreground/90">{pillarAnchor.phrase}</span>
          </div>

          {error ? (
            <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              {step.id === "company" ? (
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Required for recommendation preview
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">Full Name</div>
                        <input
                          value={form.contactName}
                          onChange={(e) => setField("contactName", e.target.value)}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="Full name"
                          aria-label="Full name"
                          required
                        />
                      </label>

                      <label className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">Company</div>
                        <input
                          value={form.companyName}
                          onChange={(e) => setField("companyName", e.target.value)}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                          placeholder="Company"
                          aria-label="Company"
                          required
                        />
                      </label>

                      <label className="space-y-2 sm:col-span-2">
                        <div className="text-sm font-semibold text-foreground">Email</div>
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
                      <div className="text-sm font-medium text-muted-foreground">Phone (optional)</div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) => setField("phone", formatPhoneAsUs(e.target.value))}
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
                        {showLocationDetails ? "Hide location details" : "Add location details"}
                      </button>
                    </div>

                    {showLocationDetails ? (
                      <div id="location-details-fields" className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                        <label className="space-y-2 sm:col-span-2">
                          <div className="text-sm font-medium text-muted-foreground">Street</div>
                          <input
                            value={form.address1}
                            onChange={(e) => setField("address1", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="Street address"
                            aria-label="Street"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">City</div>
                          <input
                            value={form.city}
                            onChange={(e) => setField("city", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="City"
                            aria-label="City"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">State</div>
                          <input
                            value={form.state}
                            onChange={(e) => setField("state", e.target.value)}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                            placeholder="State"
                            aria-label="State"
                          />
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">ZIP</div>
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
                          onClick={() => setField("workType", opt.value)}
                        >
                          <div className="absolute right-3 top-3">{selected ? selectedBadge() : null}</div>
                          <div className="pr-10 text-sm font-semibold text-foreground">{opt.label}</div>
                          <div className="mt-1 pr-10 text-xs text-muted-foreground">{opt.helper}</div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Don't see your environment? Other Safety Environment covers custom and specialized conditions.
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
                        onClick={() => setField("coverageSizeBand", opt.value)}
                      >
                        <div className="absolute right-3 top-3">{selected ? selectedBadge() : null}</div>
                        <div className="pr-10 text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">{opt.helper}</div>
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
                        <div className="absolute right-3 top-3">{selected ? selectedBadge() : null}</div>
                        <div className="pr-10 text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">{opt.helper}</div>
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
                    const isFinalOddCard = EXPOSURE_OPTIONS.length % 2 === 1 && idx === EXPOSURE_OPTIONS.length - 1;
                    return (
                      <div
                        key={opt.value}
                        role="button"
                        tabIndex={0}
                        aria-label={selected ? `Unselect ${opt.label}` : `Select ${opt.label}`}
                        aria-pressed={selected}
                        onClick={() => toggleExposureSelection(opt.value)}
                        onFocus={() => setActiveExposureFocus(opt.value)}
                        onMouseEnter={() => setActiveExposureFocus(opt.value)}
                        onMouseLeave={() => {
                          setActiveExposureFocus((prev) => (prev === opt.value ? null : prev));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExposureSelection(opt.value);
                          }
                        }}
                        className={`${exposureCardClass(focused, selected)} ${isFinalOddCard ? "sm:col-span-2" : ""}`}
                      >
                        {focused ? <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary" aria-hidden="true" /> : null}

                        <div className="flex items-center justify-end">
                          {selected ? selectedBadge() : null}
                        </div>

                        <div className="mt-1 text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.title}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{section.helper}</p>
                          </div>
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wide ${
                              sectionFocused ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {sectionCollapsed ? "Expand" : "Collapse"}
                          </span>
                        </button>

                        {sectionCollapsed ? null : (
                          <div className="mt-4 border-t border-border pt-4">
                            <div className={`grid gap-3 ${section.options.length > 1 ? "sm:grid-cols-2" : ""}`}>
                              {section.options.map((opt) => {
                                const selected = form.currentSafetySetup.includes(opt.value);
                                const focused = activeSetupFocus === opt.value;
                                return (
                                  <div
                                    key={opt.value}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={selected ? `Unselect ${opt.label}` : `Select ${opt.label}`}
                                    aria-pressed={selected}
                                    onClick={() => toggleSetupSelection(opt.value)}
                                    onFocus={() => {
                                      setActiveSetupSection(section.id);
                                      setSetupFocus(opt.value);
                                    }}
                                    onMouseEnter={() => {
                                      setActiveSetupSection(section.id);
                                      setSetupFocus(opt.value);
                                    }}
                                    onMouseLeave={() => {
                                      setActiveSetupFocus((prev) => (prev === opt.value ? null : prev));
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        toggleSetupSelection(opt.value);
                                      }
                                    }}
                                    className={exposureCardClass(focused, selected, true)}
                                  >
                                    {focused ? <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary" aria-hidden="true" /> : null}

                                    <div className="flex items-center justify-end">
                                      {selected ? selectedBadge() : null}
                                    </div>

                                    <div className="text-sm font-semibold leading-tight text-foreground">{opt.label}</div>
                                    <div className="mt-1 text-xs leading-snug text-muted-foreground">{opt.helper}</div>
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
                        <div className="absolute right-3 top-3">{selected ? selectedBadge() : null}</div>
                        <div className="pr-10 text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-2 pr-10 text-xs font-medium text-foreground">Best for: {opt.bestFor}</div>
                        <div className="mt-1 pr-10 text-xs text-muted-foreground">{opt.helper}</div>
                        <div className="mt-2 pr-10 text-xs text-foreground/80">{opt.impact}</div>
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
                  <button type="button" onClick={goNext} className={primaryButtonClass}>
                    Continue
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={onComplete} className={primaryButtonClass}>
                      Generate Recommendation Preview
                    </button>
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-6 rounded-lg border border-border bg-card p-5">
                {step.id === "company" ? (
                  <div className="mb-2 text-xs italic text-muted-foreground">
                    You are shaping service consistency, adoption outcomes, uptime continuity, and audit readiness.
                  </div>
                ) : null}
                <div className="text-sm font-semibold text-foreground">Advisory Guidance</div>
                <div className="mt-1 text-xs text-muted-foreground">Guidance updates as you make selections.</div>
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
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{section.body}</p>
                    </section>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden" data-pdf-exclude="true">
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
                  <div className="text-sm font-semibold text-foreground">Advisory Guidance</div>
                  <div className="text-xs text-muted-foreground">
                    Tap To {mobileGuidanceOpen ? "Minimize" : "Open"} Details
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {mobileGuidanceOpen ? "Hide" : "Guidance"}
                </span>
              </button>

              {mobileGuidanceOpen ? (
                <div id="mobile-program-guidance" className="max-h-[70vh] space-y-4 overflow-y-auto border-t border-border p-4 text-sm text-muted-foreground">
                  {step.id === "company" ? (
                    <div className="text-xs italic leading-relaxed text-muted-foreground">
                      You are shaping service consistency, adoption outcomes, uptime continuity, and audit readiness.
                    </div>
                  ) : null}
                  {guidance.selectedLabel ? (
                    <div>
                      <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {guidance.selectedLabel}
                      </span>
                    </div>
                  ) : null}
                  {guidance.sections.map((section) => (
                    <section key={section.title}>
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{section.body}</p>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {draft.programConfig?.active ? (
            <div className="mt-8 rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
              A recommended configuration is stored for this session. You can regenerate it at any time.
            </div>
          ) : null}
        </SectionWrap>
      </div>
    </section>
  );
}

function guidanceSections(
  first: GuidanceSection,
  second: GuidanceSection,
  third: GuidanceSection,
  fourth: GuidanceSection
): [GuidanceSection, GuidanceSection, GuidanceSection, GuidanceSection] {
  return [first, second, third, fourth];
}

function selectedSetupInSection(selectedSetup: CurrentSafetySetup[], sectionId: CurrentSetupSectionId) {
  const section = CURRENT_SETUP_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return null;
  return section.options.find((option) => selectedSetup.includes(option.value))?.value ?? null;
}

function buildGuidance(args: {
  stepId: StepId;
  form: RecommendationInputs;
  locationOptionId: "single" | "multi_same_region" | "multi_across_regions" | "multi_complex";
  activeExposureFocus: ProgramExposureRisk | null;
  activeSetupFocus: CurrentSafetySetup | null;
  activeSetupSection: CurrentSetupSectionId;
}): GuidanceContent {
  const { stepId, form } = args;

  if (stepId === "company") {
    return {
      selectedLabel: null,
      sections: guidanceSections(
        {
          title: "What to complete first",
          body: "Start with Full Name, Company, and Email so we can generate a reliable recommendation preview.",
        },
        {
          title: "How this keeps your rollout aligned",
          body: "A clear primary contact keeps decisions and follow-through consistent as teams and sites expand.",
        },
        {
          title: "How this supports adoption",
          body: "Consistent contact ownership reduces mixed messages and helps employees trust the program process.",
        },
        {
          title: "What helps audit readiness later",
          body: "Baseline company details make future documentation cleaner when you review approvals and program history.",
        }
      ),
    };
  }

  if (stepId === "work_type") {
    const content = workTypeExplainer(form.workType);
    const selected = WORK_TYPE_OPTIONS.find((option) => option.value === form.workType)?.label ?? null;
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "What this environment looks like", body: content.conditions },
        { title: "What keeps service steady", body: content.needs },
        { title: "What keeps audits cleaner", body: content.compliance },
        { title: "How this scales without resets", body: content.why }
      ),
    };
  }

  if (stepId === "coverage") {
    const band = form.coverageSizeBand ?? "31_60";
    const selected = COVERAGE_BANDS.find((option) => option.value === band)?.label ?? null;
    const map: Record<string, { complexity: string; admin: string; scale: string; nextMove: string }> = {
      "1_30": {
        complexity: "Scheduling is usually direct with quick coordination and fewer exception cycles.",
        admin: "One owner can often manage policy checks, questions, and replacements without extra layers.",
        scale: "Early consistency matters now so you do not need to reset structure when headcount grows.",
        nextMove: "Set simple standards now so every new hire follows the same intake and ordering path.",
      },
      "31_60": {
        complexity: "Scheduling starts to include grouped onboarding and higher question volume across shifts.",
        admin: "Clear eligibility and replacement rules reduce one-off requests that slow the team down.",
        scale: "Repeatable communication and ordering flows become important for steady service quality.",
        nextMove: "Document ownership for approvals and employee questions before volume climbs further.",
      },
      "61_100": {
        complexity: "Cross-team handoffs increase, so scheduling consistency and role clarity matter more.",
        admin: "Admin work expands into tracking, exception handling, and a steadier reporting rhythm.",
        scale: "Standardized workflows reduce manual follow-up and stabilize execution across departments.",
        nextMove: "Lock in repeatable timelines for approvals, fittings, replacements, and escalations.",
      },
      "101_250": {
        complexity: "Coordination spans more managers and sites, creating heavier schedule orchestration.",
        admin: "Admin load usually needs defined lanes, response targets, and clear ownership checkpoints.",
        scale: "Growth is smoother when governance and process ownership are already documented.",
        nextMove: "Formalize coverage rules now to keep policy decisions consistent between teams.",
      },
      "251_500": {
        complexity: "Scheduling and exception work become ongoing operational workflows, not occasional events.",
        admin: "Approvals and policy enforcement require regular oversight and clean reporting cadence.",
        scale: "Role-based controls and program governance keep throughput fair and predictable at size.",
        nextMove: "Build site-level accountability with centralized standards to avoid local policy drift.",
      },
      "500_plus": {
        complexity: "Scheduling spans multiple channels, stakeholders, and local constraints simultaneously.",
        admin: "Centralized controls and escalation governance are typically required for reliable execution.",
        scale: "Enterprise readiness depends on standardized playbooks and strong cross-site ownership.",
        nextMove: "Set operating guardrails early so scale does not increase exceptions or audit risk.",
      },
    };
    const copy = map[band] ?? map["31_60"];
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "How scheduling works at this size", body: copy.complexity },
        { title: "What your admin load looks like", body: copy.admin },
        { title: "How this grows with you", body: copy.scale },
        { title: "What to align now", body: copy.nextMove }
      ),
    };
  }

  if (stepId === "locations") {
    const selected = LOCATION_MODELS.find((option) => option.id === args.locationOptionId)?.label ?? null;
    const model = form.locationModel;
    const map: Record<ProgramLocationModel, { scheduling: string; oversight: string; execution: string; nextMove: string }> = {
      single: {
        scheduling: "Scheduling stays centralized, which helps launch quickly and keep turnaround predictable.",
        oversight: "One coordinator can usually manage communication, policy updates, and issue routing cleanly.",
        execution: "Service delivery is easier to standardize when teams share one location and one process owner.",
        nextMove: "Define a repeatable baseline now so expansion to additional sites does not require rework.",
      },
      multi_same_region: {
        scheduling: "Regional batching by site and shift keeps calendars manageable and reduces missed coverage.",
        oversight: "Shared playbooks allow a central owner to keep policy enforcement consistent across locations.",
        execution: "Execution improves when each site follows the same handoff, escalation, and support expectations.",
        nextMove: "Confirm site contacts and escalation paths so regional coordination remains predictable.",
      },
      multi_across_regions: {
        scheduling: "Scheduling spans different local timelines, constraints, and staffing rhythms across regions.",
        oversight: "Distributed operations need standardized approvals and reporting to prevent policy drift.",
        execution: "Cross-region delivery works best with clear governance and flexible but controlled routing rules.",
        nextMove: "Set cross-site standards for approvals and exception handling before volume increases further.",
      },
    };
    const copy = map[model];
    return {
      selectedLabel: selected,
      sections: guidanceSections(
        { title: "How coordination will feel day to day", body: copy.scheduling },
        { title: "How to keep standards consistent", body: copy.oversight },
        { title: "How this protects service uptime", body: copy.execution },
        { title: "What to lock in next", body: copy.nextMove }
      ),
    };
  }

  if (stepId === "exposures") {
    const selected = form.exposureRisks;
    const active = args.activeExposureFocus && selected.includes(args.activeExposureFocus) ? args.activeExposureFocus : selected[0] ?? null;
    if (!active) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          {
            title: "Start by selecting exposures",
            body: "Select one or more exposures to see how they shape your program guidance.",
          },
          {
            title: "How this affects fit and comfort",
            body: "Exposure choices influence which product features improve consistent daily wear across your workforce.",
          },
          {
            title: "How this affects uptime",
            body: "The right exposure profile reduces visibility disruptions and lowers avoidable replacement friction.",
          },
          {
            title: "How this affects compliance",
            body: "Exposure-based standards make policy decisions easier to document and audit later.",
          }
        ),
      };
    }
    const copy = exposureExplainer(active);
    return {
      selectedLabel: exposureLabel(active),
      sections: guidanceSections(
        { title: "What this means in real work conditions", body: copy.meaning },
        { title: "What keeps service uptime steady", body: copy.implications },
        { title: "What keeps your policy clear", body: copy.compliance },
        {
          title: "How to apply this across teams",
          body: "Use this exposure as a baseline and add role-specific controls only where they are operationally necessary.",
        }
      ),
    };
  }

  if (stepId === "budget") {
    if (!form.budgetPreference) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          { title: "Choose your direction", body: EMPTY_GUIDANCE_MESSAGE },
          {
            title: "How this changes your rollout",
            body: "Your direction sets how much service depth and governance support the recommendation should include.",
          },
          {
            title: "How this affects adoption and uptime",
            body: "Direction influences whether the recommendation prioritizes lean consistency or higher support resilience.",
          },
          {
            title: "How to decide confidently",
            body: "Pick the option that best matches your operational pace, not only your near-term budget target.",
          }
        ),
      };
    }
    const selectedBudget = form.budgetPreference;
    const copy = budgetPreferenceExplainer(selectedBudget);
    return {
      selectedLabel: budgetPreferenceLabel(selectedBudget),
      sections: guidanceSections(
        { title: "How this changes your operating model", body: copy.impact },
        { title: "How this shapes the recommendation", body: copy.recommendation },
        { title: "Who this path is best for", body: copy.bestFor },
        {
          title: "What to review before generating",
          body: "Confirm this direction reflects your rollout goals so the generated preview matches how you plan to execute.",
        }
      ),
    };
  }

  const activeSection = args.activeSetupSection;
  const activeInSection = selectedSetupInSection(form.currentSafetySetup, activeSection);
  const activeSelection = args.activeSetupFocus && setupSectionForItem(args.activeSetupFocus)?.id === activeSection ? args.activeSetupFocus : activeInSection;
  if (activeSection === "coverage_type") {
    if (!activeSelection) {
      return {
        selectedLabel: null,
        sections: guidanceSections(
          { title: "Choose a coverage type", body: "Select a coverage type to see how it shapes compliance and operations." },
          {
            title: "Compliance and audit trail",
            body: "Coverage-type decisions define what documentation and verification checks your team needs to maintain.",
          },
          {
            title: "Employee adoption and wear consistency",
            body: "Matching coverage pathways to real worker needs is the strongest predictor of consistent wear behavior.",
          },
          {
            title: "Replacement cadence and admin load",
            body: "Coverage pathways change remake frequency, inventory planning, and approval workload.",
          }
        ),
      };
    }
    const copy = setupExplainer(activeSelection);
    return {
      selectedLabel: setupLabel(activeSelection),
      sections: guidanceSections(
        { title: "Compliance and audit trail", body: copy.compliance },
        { title: "Employee adoption and wear consistency", body: copy.structure },
        { title: "Replacement frequency expectations", body: copy.admin },
        {
          title: "Administrative load and approvals",
          body: "Plan clear approval boundaries for exceptions so coverage choices stay consistent as request volume grows.",
        }
      ),
    };
  }

  if (!activeSelection) {
    const sectionLabel = activeSection === "funding" ? "Safety Program" : activeSection === "approval" ? "Approval Workflow" : "Delivery Method";
    return {
      selectedLabel: null,
      sections: guidanceSections(
        { title: `Select a ${sectionLabel} option`, body: `Choose a ${sectionLabel.toLowerCase()} option to see section-specific guidance.` },
        {
          title: "How this affects structure",
          body: setupSectionExplainer(activeSection),
        },
        {
          title: "How this affects adoption",
          body: "Selections in this section influence how easily employees follow the intended ordering and wear process.",
        },
        {
          title: "How this affects admin effort",
          body: "The choice here shapes approval volume, handoffs, and support workload as your program scales.",
        }
      ),
    };
  }

  const copy = setupExplainer(activeSelection);
  return {
    selectedLabel: setupLabel(activeSelection),
    sections: guidanceSections(
      { title: "How this affects your structure", body: copy.structure },
      { title: "How this supports compliance", body: copy.compliance },
      { title: "How this changes admin workload", body: copy.admin },
      {
        title: "How this connects to the next section",
        body: "Keep this choice aligned with adjacent setup sections so approval, delivery, and coverage decisions reinforce each other.",
      }
    ),
  };
}

function workTypeExplainer(workType: ProgramWorkType) {
  const map: Record<ProgramWorkType, { conditions: string; needs: string; compliance: string; why: string }> = {
    manufacturing: {
      conditions:
        "Production lines, machinery zones, and shift-based staffing create repeated exposure patterns that require dependable daily protection.",
      needs:
        "Programs typically need durable frames, consistent side shield standards, reliable replacement pathways, and comfort that supports all-shift wear.",
      compliance:
        "ANSI-aligned standards and site PPE policies are usually mandatory, with clear documentation expected during internal and external reviews.",
      why:
        "A structured program limits exceptions, keeps eligibility consistent across teams, and protects productivity when replacements are needed.",
    },
    construction: {
      conditions:
        "Field environments involve high movement, variable weather, debris exposure, and changing light conditions across active job sites.",
      needs:
        "High-durability frame options, secure fit performance, glare-management choices, and fast replacement support are critical for continuity.",
      compliance:
        "Construction programs frequently face site audits and require documented issuance patterns that prove policy adherence.",
      why:
        "Standardized ordering and approval rules reduce coverage gaps when crews rotate between sites and supervisors.",
    },
    utilities: {
      conditions:
        "Field dispatch models create frequent weather, lighting, and visibility changes across routes, facilities, and service regions.",
      needs:
        "Programs often need glare management, fog control, PPE compatibility, and dependable availability for mobile crews.",
      compliance:
        "Regulated environments typically require clear proof of compliant eyewear access and role-appropriate controls.",
      why:
        "A defined program lowers operational friction as teams move across regions and supervisors need predictable fulfillment.",
    },
    warehouse: {
      conditions:
        "Forklift traffic, pick-pack cadence, particulate exposure, and multi-shift staffing demand durable day-to-day eye protection.",
      needs:
        "Programs perform best with impact-ready standards, long-wear comfort, and predictable replacement cadence for active teams.",
      compliance:
        "Warehouse PPE policy usually requires consistent side-shield coverage and straightforward issuance traceability.",
      why:
        "Repeatable issuance and tracking reduces missed coverage, minimizes escalations, and supports faster onboarding.",
    },
    healthcare: {
      conditions:
        "Clinical and support roles often combine frequent cleaning cycles, screen-intensive work, and occasional splash-risk scenarios.",
      needs:
        "Clarity-first lens options, anti-reflective support, sustained comfort, and role-specific splash protection are common requirements.",
      compliance:
        "Infection-control requirements and documented PPE consistency may apply across departments and facilities.",
      why:
        "Structured programs reduce reimbursement variability while supporting consistent policy enforcement and employee adoption.",
    },
    public_sector: {
      conditions:
        "Public-sector environments blend diverse roles, facility types, and hazard levels under strong governance and approval controls.",
      needs:
        "Role-based coverage definitions, clear eligibility policy, and standard reporting are essential for shared accountability.",
      compliance:
        "Procurement governance and audit-readiness expectations typically require strong documentation and process consistency.",
      why:
        "A structured program provides dependable cross-department governance while reducing policy drift between locations.",
    },
    laboratory: {
      conditions:
        "Lab workflows frequently involve chemical handling, splash risk, and environmental factors that increase fog events.",
      needs:
        "Sealed or splash-oriented protection options, anti-fog support, and strict standardization are commonly required.",
      compliance:
        "Laboratory safety programs usually maintain strict documented controls for approved options and replacement handling.",
      why:
        "Strong policy control prevents mismatched protection decisions that can create compliance and safety exposure.",
    },
    other: {
      conditions:
        "Mixed or specialized environments often include role-specific hazards that do not fit a single predefined template.",
      needs:
        "Programs benefit from a compliant baseline plus controlled add-on flexibility for distinct exposure profiles.",
      compliance:
        "Compliance expectations should be mapped to site-level policy, role exposure, and documented approval boundaries.",
      why:
        "A structured baseline enables growth while keeping controls consistent as hazards, staffing, and locations evolve.",
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
  };
  return map[risk];
}

function exposureExplainer(risk: ProgramExposureRisk) {
  const map: Record<ProgramExposureRisk, { meaning: string; implications: string; compliance: string }> = {
    high_impact: {
      meaning:
        "Employees operate near tools, machinery, or high-movement activity where unexpected impact events are realistic.",
      implications:
        "Prioritize high-durability frames, dependable side protection, and fit consistency that holds during active motion.",
      compliance:
        "Programs should lock approved frame classes and replacement rules to avoid unsafe substitutions or delayed reissue.",
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
        "Define whether sun-related options are role-based, restricted, or conditionally approved to prevent policy drift.",
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
        "Extended digital viewing and near-focus activity can increase visual fatigue and reduce comfort over long shifts.",
      implications:
        "Anti-reflective and blue-light-support options can improve clarity, comfort, and sustained program adoption.",
      compliance:
        "Clear add-on eligibility controls help prevent inconsistent upgrades, reimbursement disputes, and billing leakage.",
    },
  };
  return map[risk];
}

function setupLabel(item: CurrentSafetySetup) {
  const map: Record<CurrentSafetySetup, string> = {
    no_formal_program: "No Formal Program",
    reimbursement: "Vendor / Optometry Partnership",
    vendor_optometry_partnership: "Vendor / Optometry Partnership",
    voucher: "Voucher / Reimbursement System",
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
    non_prescription_safety_eyewear: "Non-Prescription Safety Eyewear",
    otg_non_prescription_eyewear: "Bulk Over the Glasses",
    hybrid_eyewear: "Hybrid Model",
  };
  return map[item];
}

function setupSectionExplainer(sectionId: CurrentSetupSectionId) {
  const map: Record<CurrentSetupSectionId, string> = {
    funding:
      "Program structure decisions in this section determine policy consistency and how smoothly you can scale to more employees.",
    approval:
      "Approval design in this section controls exception volume and helps you stay audit-ready without slowing operations.",
    delivery:
      "Delivery choices in this section directly affect employee adoption and service uptime across your sites.",
    coverage_type:
      "Coverage pathways in this section define how reliably teams receive compliant products without manual rework.",
  };
  return map[sectionId];
}

function setupExplainer(item: CurrentSafetySetup) {
  const map: Record<CurrentSafetySetup, { structure: string; compliance: string; admin: string }> = {
    no_formal_program: {
      structure:
        "Purchasing is mostly ad hoc, with limited eligibility structure and inconsistent enforcement across departments.",
      compliance:
        "Compliance performance depends heavily on local manager behavior and individual buying decisions.",
      admin:
        "Administrative friction is high due to repeated clarifications, corrections, and exception handling.",
    },
    reimbursement: {
      structure:
        "Safety eyewear is routed through a partner vendor or optometry network tied to vision benefits coverage.",
      compliance:
        "Compliance improves when partner catalogs and eligibility rules are aligned to approved safety standards.",
      admin:
        "Administration shifts to partner coordination, eligibility validation, and exception handling.",
    },
    vendor_optometry_partnership: {
      structure:
        "Safety eyewear is routed through a partner vendor or optometry network tied to vision benefits coverage.",
      compliance:
        "Compliance improves when partner catalogs and eligibility rules are aligned to approved safety standards.",
      admin:
        "Administration shifts to partner coordination, eligibility validation, and exception handling.",
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
        "Administrative burden increases through approval queues, escalations, and response-time management.",
    },
    manager_approval_required: {
      structure:
        "Orders and exceptions route through a required approval checkpoint before fulfillment.",
      compliance:
        "This adds control over policy adherence and reduces unapproved ordering paths.",
      admin:
        "Administrative burden increases through approval queues, escalations, and response-time management.",
    },
    centralized_safety_approval: {
      structure:
        "A centralized safety team owns approvals, standards, and exception decisions across the organization.",
      compliance:
        "This model supports stronger consistency, cleaner documentation, and better audit readiness.",
      admin:
        "Admin workload is concentrated centrally, but process quality and decision clarity are usually higher.",
    },
    onsite_events: {
      structure:
        "Employees complete fitting and ordering through scheduled onsite events with direct support.",
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
        "Success depends on strong eligibility controls, clear online ordering instructions, and approved-option boundaries.",
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
    super_strict: "Foundational Standardization",
    low_budget: "Steady Operations",
    good_budget: "Balanced Growth",
    unlimited_budget: "Maximum Coverage",
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
        "Program structure stays focused on essential compliance outcomes and tighter operational standardization.",
      recommendation:
        "Recommendation leans toward lower-complexity service structure unless scale demands more support depth.",
      bestFor:
        "Best for teams prioritizing a clear foundational safety baseline with strong consistency.",
    },
    low_budget: {
      impact:
        "Program design emphasizes stable operations while preserving enough flexibility to avoid frequent exceptions.",
      recommendation:
        "Recommendation balances core controls with practical support so rollout quality stays stable without overinvesting.",
      bestFor:
        "Best for organizations that want dependable execution with moderate operational complexity.",
    },
    good_budget: {
      impact:
        "Program can support stronger employee experience, smoother operations, and more consistent policy adherence over time.",
      recommendation:
        "Recommendation typically aligns to complexity-based service structure with a balanced value approach.",
      bestFor:
        "Best for organizations investing in long-term consistency without maximizing service depth.",
    },
    unlimited_budget: {
      impact:
        "Program can prioritize scalability, richer support workflows, and premium operational performance across locations.",
      recommendation:
        "Recommendation can step up service depth to reduce execution risk and improve adoption at scale.",
      bestFor:
        "Best for organizations optimizing for maximum program performance and long-term operational resilience.",
    },
  };
  return map[value];
}


