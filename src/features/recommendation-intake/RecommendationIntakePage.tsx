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

const STEPS: Array<{ id: StepId; title: string }> = [
  { id: "company", title: "Company and Safety Contact" },
  { id: "work_type", title: "Safety Work Type" },
  { id: "coverage", title: "Safety Coverage Size" },
  { id: "locations", title: "Safety Locations" },
  { id: "exposures", title: "Safety Exposure Risks" },
  { id: "current_setup", title: "Current Safety Setup" },
  { id: "budget", title: "Program Direction" },
];

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

const LOCATION_MODELS: Array<{ value: ProgramLocationModel; label: string; helper: string }> = [
  { value: "single", label: "Single Location", helper: "Centralized rollout with straightforward scheduling, approvals, and service execution." },
  { value: "multi_same_region", label: "Multiple Locations Same Region", helper: "Regional coordination model with repeatable site scheduling and shared playbooks." },
  { value: "multi_across_regions", label: "Multiple Locations Across Regions", helper: "Distributed program model requiring strong governance, routing, and communication structure." },
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
  helper: string;
  impact: string;
}> = [
  {
    value: "super_strict",
    label: "Foundational Standardization",
    helper: "We need a tightly standardized baseline focused on core compliance and consistent execution.",
    impact: "Focuses recommendation on dependable baseline coverage with limited complexity.",
  },
  {
    value: "low_budget",
    label: "Steady Operations",
    helper: "We want stable day-to-day execution with practical flexibility for field realities.",
    impact: "Balances consistency and support while keeping operations manageable.",
  },
  {
    value: "good_budget",
    label: "Balanced Growth",
    helper: "We want to improve adoption and consistency with a stronger operational support model.",
    impact: "Maintains a strong mix of service reliability, employee experience, and control.",
  },
  {
    value: "unlimited_budget",
    label: "Maximum Coverage",
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
  return `w-full rounded-md border border-border bg-card p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
    selected ? "border-ring bg-secondary/50" : "hover:border-ring hover:bg-secondary/50"
  }`;
}

function exposureCardClass(focused: boolean, compact = false) {
  const densityClass = compact ? "p-3" : "p-4";
  if (focused) {
    return `group relative w-full rounded-lg border border-primary bg-secondary/60 ${densityClass} text-left shadow-sm ring-2 ring-primary/25 transition`;
  }
  return `group relative w-full rounded-lg border border-border bg-card ${densityClass} text-left transition hover:border-ring hover:bg-secondary/35`;
}

function selectToggleClass(selected: boolean) {
  return `inline-flex h-7 w-7 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25"
      : "border-border bg-background text-muted-foreground hover:border-ring"
  }`;
}

function stepProgressLabel(stepIndex: number) {
  return `Step ${stepIndex + 1} of ${STEPS.length}`;
}

function setupSectionForItem(item: CurrentSafetySetup) {
  return CURRENT_SETUP_SECTIONS.find((section) => section.options.some((option) => option.value === item)) ?? null;
}

export function RecommendationIntakePage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft, updateDraft } = useProgramDraft();

  const [form, setForm] = useState<RecommendationInputs>(() => ({ ...DEFAULT_RECOMMENDATION_INPUTS }));
  const [stepIndex, setStepIndex] = useState(0);
  const [activeExposureFocus, setActiveExposureFocus] = useState<ProgramExposureRisk | null>(null);
  const [lastSelectedExposureOption, setLastSelectedExposureOption] = useState<ProgramExposureRisk | null>(null);
  const [activeSetupFocus, setActiveSetupFocus] = useState<CurrentSafetySetup | null>(null);
  const [lastSelectedSetupOption, setLastSelectedSetupOption] = useState<CurrentSafetySetup | null>(null);
  const [mobileGuidanceOpen, setMobileGuidanceOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const exposureCardsRef = useRef<HTMLDivElement | null>(null);
  const currentSetupCardsRef = useRef<HTMLDivElement | null>(null);

  const step = STEPS[stepIndex];
  const progress = clamp01(stepIndex / (STEPS.length - 1));

  const explainer = useMemo(() => {
    return buildExplainer({
      stepId: step.id,
      form,
      activeExposureFocus,
      activeSetupFocus,
      setActiveExposureFocus,
      setActiveSetupFocus,
    });
  }, [activeExposureFocus, activeSetupFocus, form, step.id]);

  function setField<K extends keyof RecommendationInputs>(key: K, value: RecommendationInputs[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleExposureFocus(risk: ProgramExposureRisk) {
    const next = activeExposureFocus === risk ? null : risk;
    setActiveExposureFocus(next);
    if (form.exposureRisks.includes(risk)) {
      setLastSelectedExposureOption(risk);
    }
    if (next) {
      setMobileGuidanceOpen(true);
    }
  }

  function toggleSetupFocus(item: CurrentSafetySetup) {
    const next = activeSetupFocus === item ? null : item;
    setActiveSetupFocus(next);
    if (form.currentSafetySetup.includes(item)) {
      setLastSelectedSetupOption(item);
    }
    if (next) {
      setMobileGuidanceOpen(true);
    }
  }

  function toggleExposureSelection(risk: ProgramExposureRisk) {
    const selected = form.exposureRisks.includes(risk);
    const next = toggleMulti(form.exposureRisks, risk);
    setField("exposureRisks", next);
    if (selected) {
      if (lastSelectedExposureOption === risk) {
        setLastSelectedExposureOption(null);
      }
      return;
    }
    setLastSelectedExposureOption(risk);
  }

  function toggleSetupSelection(item: CurrentSafetySetup) {
    const selected = form.currentSafetySetup.includes(item);
    if (selected) {
      const next = form.currentSafetySetup.filter((v) => v !== item);
      setField("currentSafetySetup", next);
      if (lastSelectedSetupOption === item) {
        setLastSelectedSetupOption(null);
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
    setLastSelectedSetupOption(item);
  }

  useEffect(() => {
    if (step.id !== "exposures") return;

    const onPointerDown = (event: PointerEvent) => {
      const container = exposureCardsRef.current;
      if (!container) return;
      if (!(event.target instanceof Element)) return;

      const clickedCard = event.target.closest('[data-exposure-card="true"]');
      if (clickedCard && container.contains(clickedCard)) return;

      if (activeExposureFocus) {
        setActiveExposureFocus(null);
      }

      if (!lastSelectedExposureOption) return;
      if (!form.exposureRisks.includes(lastSelectedExposureOption)) {
        setLastSelectedExposureOption(null);
        return;
      }

      setField("exposureRisks", form.exposureRisks.filter((value) => value !== lastSelectedExposureOption));
      setLastSelectedExposureOption(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeExposureFocus, form.exposureRisks, lastSelectedExposureOption, step.id]);

  useEffect(() => {
    if (step.id !== "current_setup") return;

    const onPointerDown = (event: PointerEvent) => {
      const container = currentSetupCardsRef.current;
      if (!container) return;
      if (!(event.target instanceof Element)) return;

      const clickedCard = event.target.closest('[data-setup-card="true"]');
      if (clickedCard && container.contains(clickedCard)) return;

      if (activeSetupFocus) {
        setActiveSetupFocus(null);
      }

      if (!lastSelectedSetupOption) return;
      if (!form.currentSafetySetup.includes(lastSelectedSetupOption)) {
        setLastSelectedSetupOption(null);
        return;
      }

      setField("currentSafetySetup", form.currentSafetySetup.filter((value) => value !== lastSelectedSetupOption));
      setLastSelectedSetupOption(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeSetupFocus, form.currentSafetySetup, lastSelectedSetupOption, step.id]);

  function goNext() {
    setError("");
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function onExitEarly() {
    onNavigate("recommendation_summary", "internal");
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
        title="Program Recommendation"
        subtitle="Use Guided Steps To Generate A Recommended Program Configuration."
      />

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-0">
        <SectionWrap>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={onExitEarly} className={secondaryButtonClass}>
              Exit
            </button>
            <div className="text-sm font-semibold text-foreground">{stepProgressLabel(stepIndex)}</div>
          </div>

          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{step.title}</div>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Contact Name</div>
                      <input
                        value={form.contactName}
                        onChange={(e) => setField("contactName", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="Full name"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Company Name</div>
                      <input
                        value={form.companyName}
                        onChange={(e) => setField("companyName", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="Company"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Email</div>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="name@company.com"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Phone</div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) => setField("phone", formatPhoneAsUs(e.target.value))}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="123-456-7890"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <div className="text-sm font-medium text-foreground">Address</div>
                      <input
                        value={form.address1}
                        onChange={(e) => setField("address1", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="Street address"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">City</div>
                      <input
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="City"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">State</div>
                      <input
                        value={form.state}
                        onChange={(e) => setField("state", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="State"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">ZIP</div>
                      <input
                        value={form.zip}
                        onChange={(e) => setField("zip", e.target.value)}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
                        placeholder="ZIP"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {step.id === "work_type" ? (
                <div className="grid gap-3">
                  {WORK_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cardClass(form.workType === opt.value)}
                      onClick={() => setField("workType", opt.value)}
                    >
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {step.id === "coverage" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {COVERAGE_BANDS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cardClass(form.coverageSizeBand === opt.value)}
                      onClick={() => setField("coverageSizeBand", opt.value)}
                    >
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {step.id === "locations" ? (
                <div className="grid gap-3">
                  {LOCATION_MODELS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cardClass(form.locationModel === opt.value)}
                      onClick={() => setField("locationModel", opt.value)}
                    >
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {step.id === "exposures" ? (
                <div ref={exposureCardsRef} className="grid gap-3 sm:grid-cols-2">
                  {EXPOSURE_OPTIONS.map((opt) => {
                    const selected = form.exposureRisks.includes(opt.value);
                    const focused = activeExposureFocus === opt.value;
                    return (
                      <div
                        key={opt.value}
                        data-exposure-card="true"
                        role="button"
                        tabIndex={0}
                        aria-label={`Focus ${opt.label} details`}
                        onClick={() => toggleExposureFocus(opt.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExposureFocus(opt.value);
                          }
                        }}
                        className={exposureCardClass(focused)}
                      >
                        {focused ? <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary" aria-hidden="true" /> : null}

                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`text-[11px] font-medium uppercase tracking-wide ${
                              selected ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {selected ? "Selected" : "Select"}
                          </span>
                          <button
                            type="button"
                            aria-label={selected ? `Unselect ${opt.label}` : `Select ${opt.label}`}
                            aria-pressed={selected}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExposureSelection(opt.value);
                            }}
                            className={selectToggleClass(selected)}
                          >
                            {selected ? (
                              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                                <path d="M3.5 8.25L6.75 11.5L12.5 5.75" />
                              </svg>
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-sm border border-current" aria-hidden="true" />
                            )}
                          </button>
                        </div>

                        <div className="mt-1 text-sm font-semibold text-foreground">{opt.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
                        <div
                          className={`mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition ${
                            focused ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                          }`}
                        >
                          Details
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {step.id === "current_setup" ? (
                <div ref={currentSetupCardsRef} className="space-y-4">
                  {CURRENT_SETUP_SECTIONS.map((section) => (
                    <div key={section.id} className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{section.helper}</p>
                      </div>
                      <div className={`grid gap-2 ${section.options.length > 1 ? "sm:grid-cols-2" : ""}`}>
                        {section.options.map((opt) => {
                          const selected = form.currentSafetySetup.includes(opt.value);
                          const focused = activeSetupFocus === opt.value;
                          return (
                            <div
                              key={opt.value}
                              data-setup-card="true"
                              role="button"
                              tabIndex={0}
                              aria-label={`Focus ${opt.label} details`}
                              onClick={() => toggleSetupFocus(opt.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  toggleSetupFocus(opt.value);
                                }
                              }}
                              className={exposureCardClass(focused, true)}
                            >
                              {focused ? <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary" aria-hidden="true" /> : null}

                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`text-[11px] font-medium uppercase tracking-wide ${
                                    selected ? "text-primary" : "text-muted-foreground"
                                  }`}
                                >
                                  {selected ? "Selected" : "Select"}
                                </span>
                                <button
                                  type="button"
                                  aria-label={selected ? `Unselect ${opt.label}` : `Select ${opt.label}`}
                                  aria-pressed={selected}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleSetupSelection(opt.value);
                                  }}
                                  className={selectToggleClass(selected)}
                                >
                                  {selected ? (
                                    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2.25]">
                                      <path d="M3.5 8.25L6.75 11.5L12.5 5.75" />
                                    </svg>
                                  ) : (
                                    <span className="h-3.5 w-3.5 rounded-sm border border-current" aria-hidden="true" />
                                  )}
                                </button>
                              </div>

                              <div className="text-sm font-semibold leading-tight text-foreground">{opt.label}</div>
                              <div className="mt-1 text-xs leading-snug text-muted-foreground">{opt.helper}</div>
                              <div
                                className={`mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition ${
                                  focused ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                }`}
                              >
                                Details
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {step.id === "budget" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cardClass(form.budgetPreference === opt.value)}
                      onClick={() => setField("budgetPreference", opt.value)}
                    >
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.helper}</div>
                      <div className="mt-2 text-xs text-foreground/80">{opt.impact}</div>
                    </button>
                  ))}
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
                    <button
                      type="button"
                      onClick={() => onNavigate("recommendation_summary", "internal")}
                      className={secondaryButtonClass}
                    >
                      Go to Program Summary
                    </button>
                    <button type="button" onClick={onComplete} className={primaryButtonClass}>
                      Generate Recommendation Preview
                    </button>
                  </div>
                )}
              </div>
            </div>

            <aside className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-6 rounded-lg border border-border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Program Guidance</div>
                <div className="mt-1 text-xs text-muted-foreground">What This Choice Means For Your Program</div>
                <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Clear Notes On Compliance Impact, Lens And Frame Implications, And How This Choice Affects Program
                  Setup.
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">{explainer}</div>
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
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">Program Guidance</div>
                  <div className="text-xs text-muted-foreground">
                    Tap To {mobileGuidanceOpen ? "Minimize" : "Open"} Details
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {mobileGuidanceOpen ? "Hide" : "Guidance"}
                </span>
              </button>

              {mobileGuidanceOpen ? (
                <div id="mobile-program-guidance" className="max-h-[70vh] space-y-3 overflow-y-auto border-t border-border p-4 text-sm text-muted-foreground">
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    Clear Notes On Compliance Impact, Lens And Frame Implications, And How This Choice Affects Program
                    Setup.
                  </div>
                  <div className="space-y-3">{explainer}</div>
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

function buildExplainer(args: {
  stepId: StepId;
  form: RecommendationInputs;
  activeExposureFocus: ProgramExposureRisk | null;
  activeSetupFocus: CurrentSafetySetup | null;
  setActiveExposureFocus: (v: ProgramExposureRisk | null) => void;
  setActiveSetupFocus: (v: CurrentSafetySetup | null) => void;
}) {
  const { stepId, form } = args;

  if (stepId === "company") {
    return (
      <>
        <p>
          Company and safety contact details set the operating foundation for rollout speed, escalation paths, and day
          to day execution quality. Strong ownership at this stage reduces friction later when approvals, exceptions,
          and employee support questions appear.
        </p>
        <p>
          Even in mail-first programs, location context improves kickoff planning, compliance communication, travel
          forecasting, and service-tier alignment across sites and departments.
        </p>
      </>
    );
  }

  if (stepId === "work_type") {
    const content = workTypeExplainer(form.workType);
    return (
      <>
        <p className="text-foreground font-medium">Typical Conditions</p>
        <p>{content.conditions}</p>
        <p className="text-foreground font-medium">Prescription Safety Needs</p>
        <p>{content.needs}</p>
        <p className="text-foreground font-medium">Compliance Considerations</p>
        <p>{content.compliance}</p>
        <p className="text-foreground font-medium">Why Structure Matters</p>
        <p>{content.why}</p>
      </>
    );
  }

  if (stepId === "coverage") {
    const band = form.coverageSizeBand ?? "31_60";
    const map: Record<string, { complexity: string; admin: string; scale: string }> = {
      "1_30": {
        complexity: "Coordination is usually direct, with limited exception traffic and faster decision cycles.",
        admin: "Administration can stay lean with a single owner handling eligibility, questions, and follow-up.",
        scale: "Early policy discipline is still important so the program can expand without rework later.",
      },
      "31_60": {
        complexity: "Scheduling and onboarding complexity grows as employees enter in groups and questions increase.",
        admin: "Simple but clear approval and eligibility rules prevent inconsistent one-off exceptions.",
        scale: "Repeatable ordering and communication flows become important to sustain delivery quality.",
      },
      "61_100": {
        complexity: "Multiple shifts and teams increase operational overlap, handoffs, and follow-up requirements.",
        admin: "Eligibility tracking, replacement handling, and reporting cadence start to matter more.",
        scale: "Standardized workflows reduce manual back-and-forth and keep service levels predictable.",
      },
      "101_250": {
        complexity: "Higher volume requires tighter controls across managers, departments, and location leaders.",
        admin: "Administrative workload often needs defined approval lanes and batch-style operating rhythms.",
        scale: "Scaling successfully depends on clear governance, controls, and repeatable process ownership.",
      },
      "251_500": {
        complexity: "Distributed execution and exception management become continuous, not occasional, activities.",
        admin: "Approvals, policy enforcement, and reporting mature into ongoing operational workstreams.",
        scale: "Role-based and department-based rules improve fairness, compliance, and throughput at scale.",
      },
      "500_plus": {
        complexity: "Enterprise rollout introduces multi-channel delivery, layered stakeholders, and complex dependencies.",
        admin: "Centralized controls, structured reporting, and escalation governance are required for consistency.",
        scale: "Programs at this level perform best with standardized playbooks and strong cross-site ownership.",
      },
    };
    const copy = map[band] ?? map["31_60"];
    return (
      <>
        <p className="text-foreground font-medium">Coordination Complexity</p>
        <p>{copy.complexity}</p>
        <p className="text-foreground font-medium">Administrative Load</p>
        <p>{copy.admin}</p>
        <p className="text-foreground font-medium">Scaling Pattern</p>
        <p>{copy.scale}</p>
      </>
    );
  }

  if (stepId === "locations") {
    const model = form.locationModel;
    const map: Record<ProgramLocationModel, { scheduling: string; oversight: string; execution: string }> = {
      single: {
        scheduling: "Scheduling can be centralized, giving you faster launch decisions and cleaner event planning.",
        oversight: "Oversight is typically straightforward with one coordinator owning policy and communication.",
        execution: "Execution can prioritize consistency, faster turnaround, and lower operational overhead.",
      },
      multi_same_region: {
        scheduling: "Scheduling benefits from regional batching by site, shift window, and employee availability.",
        oversight: "A central owner can manage effectively when each site follows shared playbooks.",
        execution: "Execution improves when contact ownership and routing standards are consistent across locations.",
      },
      multi_across_regions: {
        scheduling: "Scheduling becomes a multi-calendar operation with different local constraints and timelines.",
        oversight: "Distributed oversight needs standardized approvals, reporting, and escalation rules.",
        execution: "Cross-region execution requires a flexible model that still protects policy consistency.",
      },
    };
    const copy = map[model];
    return (
      <>
        <p className="text-foreground font-medium">Scheduling Coordination</p>
        <p>{copy.scheduling}</p>
        <p className="text-foreground font-medium">Oversight Model</p>
        <p>{copy.oversight}</p>
        <p className="text-foreground font-medium">Execution Capability</p>
        <p>{copy.execution}</p>
      </>
    );
  }

  if (stepId === "exposures") {
    const selected = form.exposureRisks;
    const active = args.activeExposureFocus;

    if (!selected.length && !active) {
      return (
        <>
          <p>
            Select the exposure risks that apply to your workforce. These choices shape frame durability, lens
            treatment strategy, and the policy controls needed to maintain compliance at scale.
          </p>
          <p>Use the checkbox to select exposures, then click any selected item to review detailed implementation guidance.</p>
        </>
      );
    }

    return (
      <>
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <p className="text-foreground font-medium">Selected Exposures</p>
          <p className="mt-1 text-xs text-muted-foreground">Program Guidance: How Exposure Impacts Safety Glasses Overall</p>
          <p className="mt-1 text-xs text-muted-foreground">Click One To View Details</p>
          {selected.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => args.setActiveExposureFocus(args.activeExposureFocus === risk ? null : risk)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active === risk
                      ? "border-primary bg-primary/15 font-semibold text-primary shadow-sm ring-2 ring-primary/25"
                      : "border-primary/35 bg-primary/10 font-medium text-primary hover:border-primary/60 hover:bg-primary/15"
                  }`}
                >
                  {exposureLabel(risk)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No Selected Exposures Yet. Use The Top-Right Checkbox On A Card To Select.</p>
          )}
        </div>

        {active ? (
          <ExposureDetailPanel
            key={active}
            active={active}
            activeCopy={exposureExplainer(active)}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Select A Selected Exposure To Show Detailed Guidance.
          </div>
        )}
      </>
    );
  }

  if (stepId === "budget") {
    const selectedBudget = form.budgetPreference ?? "good_budget";
    const copy = budgetPreferenceExplainer(selectedBudget);
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected Program Direction</p>
        <div className="mt-2 inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {budgetPreferenceLabel(selectedBudget)}
        </div>
        <p className="mt-3 text-foreground font-medium">How This Impacts Program Design</p>
        <p>{copy.impact}</p>
        <p className="text-foreground font-medium">How This Shapes Recommendation</p>
        <p>{copy.recommendation}</p>
        <p className="text-foreground font-medium">Best Fit Scenario</p>
        <p>{copy.bestFor}</p>
      </div>
    );
  }

  const selectedSetup = form.currentSafetySetup;
  const active = args.activeSetupFocus;

  if (!selectedSetup.length && !active) {
    return (
      <>
        <p>
          Select setup signals by section to reflect how your program runs today. This context aligns recommendations
          to real operating constraints, not just ideal-state policy.
        </p>
        <p>
          Choose one option per section for cleaner guidance across safety program, approval workflow, delivery
          method, and coverage type.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-secondary/20 p-3">
        <p className="text-foreground font-medium">Selected Setup Signals</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Program Guidance: How Current Setup Impacts Safety Glasses Program Operations
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Click One To View Details</p>
        {selectedSetup.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedSetup.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => args.setActiveSetupFocus(args.activeSetupFocus === item ? null : item)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active === item
                    ? "border-primary bg-primary/15 font-semibold text-primary shadow-sm ring-2 ring-primary/25"
                    : "border-primary/35 bg-primary/10 font-medium text-primary hover:border-primary/60 hover:bg-primary/15"
                }`}
              >
                {setupLabel(item)}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No Selected Setup Signals Yet. Use The Top-Right Checkbox On A Card To Select.</p>
        )}
      </div>

      {active ? (
        <SetupDetailPanel key={active} active={active} copy={setupExplainer(active)} />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Select A Selected Setup Signal To Show Detailed Guidance.
        </div>
      )}
    </>
  );
}

function ExposureDetailPanel(args: {
  active: ProgramExposureRisk;
  activeCopy: { meaning: string; implications: string; compliance: string };
}) {
  const { active, activeCopy } = args;

  return (
    <>
      <style>{`@keyframes exposureDetailSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="rounded-lg border border-primary/20 bg-primary/5 p-4"
        style={{ animation: "exposureDetailSlideUp 220ms ease-out" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected Exposure Details</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {exposureLabel(active)}
          </div>
        </div>
        <p className="mt-3 text-foreground font-medium">What This Exposure Means</p>
        <p>{activeCopy.meaning}</p>
        <p className="text-foreground font-medium">Lens And Frame Implications</p>
        <p>{activeCopy.implications}</p>
        <p className="text-foreground font-medium">Compliance And Program Setup</p>
        <p>{activeCopy.compliance}</p>
      </div>
    </>
  );
}

function SetupDetailPanel(args: {
  active: CurrentSafetySetup;
  copy: { structure: string; compliance: string; admin: string };
}) {
  const { active, copy } = args;

  return (
    <>
      <style>{`@keyframes setupDetailSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" style={{ animation: "setupDetailSlideUp 220ms ease-out" }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected Setup Details</p>
        <div className="mt-2 inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {setupLabel(active)}
        </div>
        <p className="mt-3 text-foreground font-medium">Program Structure Impact</p>
        <p>{copy.structure}</p>
        <p className="text-foreground font-medium">Compliance Control</p>
        <p>{copy.compliance}</p>
        <p className="text-foreground font-medium">Administrative Load</p>
        <p>{copy.admin}</p>
      </div>
    </>
  );
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


