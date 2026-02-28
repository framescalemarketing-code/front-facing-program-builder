"use client";

import { useEffect, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import {
  defaultDraft,
  type EUPackage,
  type ServiceTier,
} from "@/lib/programDraft";
import {
  deriveProgramConfigFromDraft,
  type ProgramBudgetPreference,
  type ProgramComplexityTier,
  type ProgramConfig,
  type ProgramExposureRisk,
  type ProgramLocationModel,
} from "@/lib/programConfig";
import type { CoatingRecommendation } from "@/lib/recommendProgram";
import "./recommendationSummaryPrint.css";

const RECOMMENDATION_START_STEP_KEY = "osso_recommendation_start_step";
const DIRECTION_STEP_INDEX = 6;
const LOCATIONS_STEP_INDEX = 3;
type CoverageSizeBand = NonNullable<
  ProgramConfig["programProfile"]["coverageSizeBand"]
>;

function nonEmpty(value: string | undefined | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function workTypeLabel(value: string | undefined) {
  const map: Record<string, string> = {
    manufacturing: "Manufacturing & Production",
    construction: "Construction & Field Work",
    utilities: "Utilities & Field Services",
    warehouse: "Warehouse & Distribution",
    healthcare: "Healthcare & Clinical",
    public_sector: "Public Sector & Municipal",
    laboratory: "Laboratory & Research",
    other: "Specialized / Mixed Environment",
  };
  return map[value ?? ""] ?? null;
}

function coverageBandLabel(value: string | undefined) {
  const map: Record<string, string> = {
    "1_30": "1 to 30",
    "31_60": "31 to 60",
    "61_100": "61 to 100",
    "101_250": "101 to 250",
    "251_500": "251 to 500",
    "500_plus": "500+",
  };
  return map[value ?? ""] ?? null;
}

function locationModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    single: "Single location",
    multi_same_region: "Multiple locations in one region",
    multi_across_regions: "Multiple locations across regions",
  };
  return map[value ?? ""] ?? null;
}

function budgetPreferenceLabel(value: ProgramBudgetPreference | undefined) {
  const map: Record<ProgramBudgetPreference, string> = {
    super_strict: "Compliance First",
    low_budget: "Operations Focused",
    good_budget: "Ready to Grow",
    unlimited_budget: "Full Program Investment",
  };
  if (!value) return null;
  return map[value] ?? null;
}

function packageTierExplainer(
  euPackage: EUPackage | null,
  serviceTier: ServiceTier | null,
) {
  if (!euPackage || !serviceTier) return null;
  const map: Record<string, string> = {
    "Compliance|Essential":
      "Your program starts with the right foundation — a clear standard your team can actually enforce, simple eligibility rules, and a service structure sized for where you are today. This keeps things manageable while you build the program out.",
    "Compliance|Access":
      "A structured compliance baseline with enough service cadence to keep the program current as headcount grows, shifts change, or new hires come on. It's built to stay consistent without heavy oversight.",
    "Comfort|Access":
      "Better fit selection and stronger adoption support built into the standard. Employees get what they need to actually wear their eyewear — which is how the program earns its value day to day.",
    "Comfort|Premier":
      "Full adoption-focused package with the service depth to run it consistently. The right fit for environments where wear compliance matters as much as technical protection — because a pair sitting in a locker isn't protecting anyone.",
    "Complete|Access":
      "Broader coverage options and prescription flexibility for mixed-role environments, paired with service cadence that keeps access consistent without heavy coordination overhead.",
    "Complete|Premier":
      "The most common recommendation for growing programs that need performance features, mixed prescriptions, and a service structure that doesn't require constant manual management. Built for teams that are ready to scale.",
    "Complete|Enterprise":
      "Enterprise service depth applied to a Complete package — for large or complex programs where operational support and broader coverage need to scale together without one outpacing the other.",
    "Covered|Premier":
      "Maximum configurability for organizations with multiple job functions, locations, or operating conditions — paired with Premier service so the complexity doesn't land on your team.",
    "Covered|Enterprise":
      "The full partnership model. Dedicated support, deeper governance, and a service structure built to stay consistent as your workforce, sites, and compliance requirements evolve. This is the most comprehensive combination we offer.",
  };
  return map[`${euPackage}|${serviceTier}`] ?? null;
}

function trustNoteVariant(
  band: CoverageSizeBand | undefined,
  location: ProgramLocationModel | undefined,
  posture?: ProgramBudgetPreference,
  setup: ProgramConfig["programProfile"]["currentSafetySetup"] = [],
  exposureCount = 0,
): string {
  const hasNoFormalProgram = (setup ?? []).includes("no_formal_program");
  const isMultiLocation =
    location === "multi_same_region" || location === "multi_across_regions";

  if (band === "500_plus" && location === "multi_across_regions") {
    return "At this size and spread, a self-serve recommendation is a great starting map — but we want to make sure it really fits. You'll be connected with a senior OSSO specialist who'll work through your site structure, compliance needs, and timeline before anything is confirmed.";
  }

  if (
    (band === "251_500" || band === "500_plus") &&
    isMultiLocation &&
    (posture === "good_budget" || posture === "unlimited_budget")
  ) {
    return "Programs at this scale get a dedicated specialist before anything is finalized. You'll be paired with someone who's run multi-site programs and knows where things tend to break down — so you don't have to figure that out alone.";
  }

  if (band === "1_30" && hasNoFormalProgram && posture === "super_strict") {
    return "This gives you a solid starting point — not a finished program. A specialist will review your setup with you and make sure it fits before anything is built. For most programs at this stage, that conversation is about 20 minutes.";
  }

  if (
    (band === "31_60" || band === "61_100" || band === "101_250") &&
    location === "single"
  ) {
    return "This is a strong starting point for your conversation with a specialist — not a final commitment. They'll review it with you, adjust based on your site and timeline, and make sure it actually fits. Most programs this size are up and running within 60 days.";
  }

  if (band === "1_30" && location === "single" && exposureCount === 0) {
    return "For programs under 30 employees our specialist will confirm program structure fits before proceeding.";
  }

  return "This recommendation is your starting point. Your OSSO specialist will go through it with you and make sure everything fits before anything is finalized.";
}

function recommendationSnapshotContext(
  band: CoverageSizeBand | undefined,
  location: ProgramLocationModel | undefined,
  posture: ProgramBudgetPreference | undefined,
  setup: ProgramConfig["programProfile"]["currentSafetySetup"] = [],
) {
  const hasNoFormalProgram = (setup ?? []).includes("no_formal_program");
  if (hasNoFormalProgram && posture === "super_strict") {
    return "Starting from scratch is actually the cleanest way to build this right. Your specialist will design it around your operation — not someone else's template.";
  }

  if (band === "500_plus" && location === "multi_across_regions") {
    return "At this scale, we assign a dedicated program specialist before anything is configured. This is a partnership - not a self-serve program.";
  }

  return null;
}

function deliveryModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    onsite: "Onsite",
    regional_centers: "Regional Service Centers",
    mail: "Online Ordering",
    hybrid: "Hybrid",
  };
  return map[value ?? ""] ?? null;
}

function approvalModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    none: "Approval Not Needed",
    manager: "Approval Needed",
    centralized_safety: "Approval Needed",
  };
  return map[value ?? ""] ?? null;
}

function exposureRiskLabel(risk: ProgramExposureRisk) {
  const map: Record<ProgramExposureRisk, string> = {
    high_impact: "high-impact tasks",
    dust_debris: "dust and debris",
    chemical_splash: "chemical splash risk",
    outdoor_glare: "outdoor glare",
    fog_humidity: "fog and humidity",
    indoor_outdoor_shift: "indoor/outdoor shifts",
    screen_intensive: "screen-intensive work",
    temperature_extremes: "temperature extremes",
  };
  return map[risk];
}

function summarizeExposureRisks(risks: ProgramExposureRisk[] | undefined) {
  if (!risks || risks.length === 0) return null;
  if (risks.length === 1) return exposureRiskLabel(risks[0]);
  if (risks.length === 2)
    return `${exposureRiskLabel(risks[0])} and ${exposureRiskLabel(risks[1])}`;
  const firstTwo = risks
    .slice(0, 2)
    .map((risk) => exposureRiskLabel(risk))
    .join(", ");
  return `${firstTwo}, and related risk controls`;
}

function postureCard(tier: ProgramComplexityTier) {
  const map: Record<
    ProgramComplexityTier,
    {
      label: string;
      badgeClass: string;
      explanation: string;
      icon: string;
      accentColor: string;
    }
  > = {
    structurally_sound: {
      label: "Structurally Sound",
      badgeClass: "border-slate-300 bg-slate-50 text-slate-800",
      explanation:
        "Your program profile reflects a smaller team with a compliance-first mindset and limited exposure complexity. The recommendation is built around getting a clear, enforceable standard in place — defined eligibility, a simple ordering path, and the controls to start strong. Everything is sized so you can build on it as the program matures.",
      icon: "",
      accentColor: "#475569",
    },
    operationally_strong: {
      label: "Operationally Strong",
      badgeClass: "border-slate-300 bg-slate-50 text-slate-800",
      explanation:
        "Your program profile reflects a mid-tier operation focused on keeping things running smoothly. With an operations-focused budget direction, some exposure risks selected, and a team that's past the startup phase, the recommendation is tuned to reduce day-to-day friction — streamlined workflows, reliable employee access, and enough oversight to catch problems before they compound.",
      icon: "",
      accentColor: "#475569",
    },
    system_scalable: {
      label: "System Scalable",
      badgeClass: "border-slate-300 bg-slate-50 text-slate-800",
      explanation:
        "Your program profile reflects a larger employee count, multiple sites, and growing capital investment. At this stage, manual coordination breaks down — standards drift between sites, exceptions pile up, and execution gets inconsistent. The recommendation is built for the growth phase: keeping your program aligned across locations and giving you the infrastructure to scale without losing control.",
      icon: "",
      accentColor: "#475569",
    },
    enterprise_grade: {
      label: "Enterprise Grade",
      badgeClass: "border-slate-300 bg-slate-50 text-slate-800",
      explanation:
        "Your program profile reflects top-tier selections, a large workforce across multiple sites, and high operational complexity. At your scale, governance, dedicated support, and cross-site consistency aren't optional — they're the baseline. The recommendation includes specialist partnership, leadership-level visibility, and processes built to hold up across regions, roles, and compliance environments.",
      icon: "",
      accentColor: "#475569",
    },
  };
  return map[tier];
}

function generatedRecommendationSummary(args: {
  workType: string | null;
  coverageBand: string | null;
  exposureSummary: string | null;
  packageName: string | null;
  serviceTier: string | null;
}) {
  const workType = args.workType ?? "workforce profile";
  const coverageBand = args.coverageBand
    ? `${args.coverageBand} employees`
    : "your current team size";
  const exposureSummary =
    args.exposureSummary ?? "your current exposure profile";
  const packageName = args.packageName ?? "the recommended package";
  const serviceTier = args.serviceTier ?? "the recommended service tier";

  return `Based on your ${workType.toLowerCase()}, ${coverageBand}, and ${exposureSummary}, we're recommending ${packageName} with ${serviceTier} service. This combination is built to keep adoption high, reduce day-to-day friction, and give you a program you can count on.`;
}

function SummaryRow(props: {
  label: string;
  value: string | null;
  showPlaceholderWhenEmpty?: boolean;
  placeholderText?: string;
}) {
  const hasValue = Boolean(props.value);
  if (!hasValue && !props.showPlaceholderWhenEmpty) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0">
        {props.label}
      </span>
      <span
        className={`text-sm text-right ${hasValue ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}
      >
        {hasValue ? props.value : (props.placeholderText ?? "Not provided")}
      </span>
    </div>
  );
}

function ExposurePills(props: { risks: ProgramExposureRisk[] | undefined }) {
  if (!props.risks || props.risks.length === 0) return null;
  return (
    <div className="pt-3">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Exposure Risks
      </div>
      <div className="flex flex-wrap gap-2">
        {props.risks.map((risk) => (
          <span
            key={risk}
            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {exposureRiskLabel(risk)}
          </span>
        ))}
      </div>
    </div>
  );
}

function displayValue(value: string | null) {
  return value ?? "Not provided";
}

// ─── NEW: Interactive Program Summary Card (replaces SVG placeholder) ───────

type SummaryCardSection =
  | "snapshot"
  | "profile"
  | "coverage"
  | "coatings"
  | "logistics"
  | "contact";

function ProgramSummaryCard(props: {
  companyName: string | null;
  workType: string | null;
  coverageBand: string | null;
  locationModel: string | null;
  selectedPackage: EUPackage | null;
  serviceTier: ServiceTier | null;
  hasCoatings: boolean;
  activeSection: SummaryCardSection;
  onSectionChange: (section: SummaryCardSection) => void;
}) {
  const { activeSection } = props;
  const setActiveSection = props.onSectionChange;

  const sections: Array<{
    id: SummaryCardSection;
    label: string;
    icon: string;
  }> = [
    { id: "snapshot", label: "Snapshot", icon: "📋" },
    { id: "profile", label: "Profile", icon: "📊" },
    { id: "coverage", label: "Coverage", icon: "🛡️" },
    ...(props.hasCoatings
      ? [
          {
            id: "coatings" as SummaryCardSection,
            label: "Coatings",
            icon: "🔬",
          },
        ]
      : []),
    { id: "logistics", label: "Logistics", icon: "🔄" },
    { id: "contact", label: "Contact", icon: "👤" },
  ];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
      {/* Card Header - Visual Program Identity */}
      <div
        className="relative p-6 pb-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1e3a5f 0%, #244093 35%, #2971b5 70%, #4a8bc7 100%)",
        }}
      >
        {/* Decorative geometric background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              {props.companyName && (
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
                  {props.companyName}
                </p>
              )}
              <h2 className="text-xl font-bold text-white leading-tight">
                Program Recommendation
              </h2>
              <p className="text-sm text-white/70 mt-1">
                Your specialist will walk through this with you before anything
                is set
              </p>
            </div>
            <div className="shrink-0 rounded-lg px-3 py-2 text-center backdrop-blur-sm bg-white/15 border border-white/25 shadow-lg">
              <div className="text-lg font-bold text-white">
                {props.selectedPackage ?? "—"}
              </div>
              <div className="text-[10px] font-medium text-white/70 uppercase tracking-wide">
                {props.serviceTier ?? "Service Tier"}
              </div>
            </div>
          </div>

          {/* Quick Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {props.workType && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">🏭</span> {props.workType}
              </span>
            )}
            {props.coverageBand && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">👥</span> {props.coverageBand}{" "}
                employees
              </span>
            )}
            {props.locationModel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">📍</span> {props.locationModel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <div className="border-b border-slate-200 bg-slate-50/60">
        <div className="flex overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-all border-b-2 ${
                activeSection === section.id
                  ? "border-primary text-primary bg-white shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Checklist Item ─────────────────────────────────────────────────────────

function ChecklistItem({
  children,
  done = false,
}: {
  children: React.ReactNode;
  done?: boolean;
}) {
  const [checked, setChecked] = useState(done);
  return (
    <button
      type="button"
      onClick={() => setChecked((v) => !v)}
      className="flex items-start gap-3 w-full text-left group"
      aria-pressed={checked}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          checked
            ? "border-emerald-500 bg-emerald-500"
            : "border-border group-hover:border-primary"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 fill-none stroke-white stroke-2"
          >
            <path d="M2.5 6L5 8.5L9.5 4" />
          </svg>
        )}
      </span>
      <span
        className={`text-sm transition-colors ${checked ? "line-through text-muted-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
      >
        {children}
      </span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RecommendationSummaryPage({
  onNavigate,
}: {
  onNavigate: NavigateFn;
}) {
  const { draft } = useProgramDraft();
  const program = draft?.program ?? defaultDraft.program;
  const activeConfig = draft?.programConfig?.active;
  const programConfig: ProgramConfig =
    activeConfig &&
    typeof activeConfig === "object" &&
    "programConfigVersion" in (activeConfig as Record<string, unknown>)
      ? (activeConfig as ProgramConfig)
      : deriveProgramConfigFromDraft(draft ?? defaultDraft);

  const posture = postureCard(
    programConfig.postureTier ??
      programConfig.readinessTier ??
      "structurally_sound",
  );
  const companyName =
    nonEmpty(programConfig.company.companyName) ??
    nonEmpty(draft?.program.contact.companyName);
  const contactName = nonEmpty(programConfig.company.contactName);
  const contactRole = nonEmpty(programConfig.company.role);
  const email = nonEmpty(programConfig.company.email);
  const phone = nonEmpty(programConfig.company.phone);
  const workType = workTypeLabel(programConfig.programProfile.workType);
  const coverageBand = coverageBandLabel(
    programConfig.programProfile.coverageSizeBand,
  );
  const locationModel = locationModelLabel(
    programConfig.programProfile.locationModel,
  );
  const programPosture = budgetPreferenceLabel(
    programConfig.programProfile.budgetPreference,
  );
  const deliveryModel = deliveryModelLabel(programConfig.deliveryModel.primary);
  const approvalModel = approvalModelLabel(programConfig.approvalModel.model);
  const exposureSummary = summarizeExposureRisks(
    programConfig.programProfile.exposureRisks,
  );
  const selectedPackage = nonEmpty(program.selectedEU) as EUPackage | null;
  const serviceTier = nonEmpty(program.selectedTier) as ServiceTier | null;
  const packageTierSummary = packageTierExplainer(selectedPackage, serviceTier);
  const trustNote = trustNoteVariant(
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel,
    programConfig.programProfile.budgetPreference,
    programConfig.programProfile.currentSafetySetup,
    programConfig.programProfile.exposureRisks?.length ?? 0,
  );
  const snapshotContext = recommendationSnapshotContext(
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel,
    programConfig.programProfile.budgetPreference,
    programConfig.programProfile.currentSafetySetup,
  );

  const revealSummary = generatedRecommendationSummary({
    workType,
    coverageBand,
    exposureSummary,
    packageName: selectedPackage,
    serviceTier,
  });
  const locations = program.locations ?? [];
  const afterPrintRestoreRef = useRef<Window["onafterprint"]>(null);
  const [showPrintContinue, setShowPrintContinue] = useState(false);
  const [activeCardSection, setActiveCardSection] =
    useState<SummaryCardSection>("snapshot");
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      if (afterPrintRestoreRef.current === null) return;
      window.onafterprint = afterPrintRestoreRef.current;
      afterPrintRestoreRef.current = null;
    };
  }, []);

  function navigateToCongratulations() {
    onNavigate("recommendation_congratulations", "internal");
  }

  function openRecommendationAtDirection() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        RECOMMENDATION_START_STEP_KEY,
        String(DIRECTION_STEP_INDEX),
      );
    }
    onNavigate("recommendation", "internal");
  }

  function openRecommendationAtLocations() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        RECOMMENDATION_START_STEP_KEY,
        String(LOCATIONS_STEP_INDEX),
      );
    }
    onNavigate("recommendation", "internal");
  }

  function handlePrintOrSavePdf() {
    if (typeof window === "undefined") return;

    setShowPrintContinue(false);

    afterPrintRestoreRef.current = window.onafterprint;
    window.onafterprint = () => {
      const restore = afterPrintRestoreRef.current;
      afterPrintRestoreRef.current = null;
      window.onafterprint = restore;
      setShowPrintContinue(true);
    };

    window.print();
  }

  return (
    <section aria-labelledby="recommendation-preview-title">
      <div data-pdf-exclude="true">
        {/* ── Clean Page Hero ── */}
        <header className="border-b border-gray-200/60 bg-white">
          <div
            className="h-1 bg-gradient-to-r from-[#2971b5] via-[#5e97dd] to-[#2971b5]"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-3">
                  <span aria-hidden="true">✓</span>
                  Recommendation Ready
                </div>
                <h1
                  id="recommendation-preview-title"
                  className="text-3xl font-bold tracking-tight text-gray-900"
                >
                  {companyName
                    ? `${companyName}'s Program Summary`
                    : "Your Program Summary"}
                </h1>
                <p className="mt-2 max-w-2xl text-gray-500 text-sm">
                  Built from your answers. An OSSO specialist will review this
                  with you before anything moves forward — nothing is locked
                  until you're ready.
                </p>
              </div>
              <div className="text-xs text-gray-400 mt-3 sm:mt-0 shrink-0">
                Generated {generatedOn}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionWrap>
            {/* Nav row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <button
                type="button"
                onClick={openRecommendationAtDirection}
                className={secondaryButtonClass}
              >
                ← Back to Recommendation
              </button>
              <button
                type="button"
                onClick={() => onNavigate("recommendation", "internal")}
                className={secondaryButtonClass}
              >
                Start Over
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* ── Main column ── */}
              <div className="lg:col-span-8 space-y-6">
                {/* Interactive Program Summary Card — replaces the SVG placeholder */}
                <ProgramSummaryCard
                  companyName={companyName}
                  workType={workType}
                  coverageBand={coverageBand}
                  locationModel={locationModel}
                  selectedPackage={selectedPackage}
                  serviceTier={serviceTier}
                  hasCoatings={
                    (programConfig.coatingRecommendations ?? []).length > 0
                  }
                  activeSection={activeCardSection}
                  onSectionChange={setActiveCardSection}
                />

                {/* Detailed Sections — driven by active tab */}
                <article className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  {/* Snapshot: the full picture at a glance */}
                  {activeCardSection === "snapshot" && (
                    <div className="p-0">
                      {/* Hero narrative — gradient background */}
                      <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          {revealSummary}
                        </p>
                        {packageTierSummary && (
                          <p className="text-sm text-slate-500 leading-relaxed mt-3 pl-4 border-l-2 border-[#2971b5]/30 italic">
                            {packageTierSummary}
                          </p>
                        )}
                      </div>

                      {/* Key metrics — clean grid */}
                      <div className="px-6 py-5 border-t border-slate-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              EU Package
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {selectedPackage ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Service Tier
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {serviceTier ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Coverage
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {coverageBand ? `${coverageBand} employees` : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Profile
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {posture.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Profile details */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                        <div className="flex flex-wrap gap-x-8 gap-y-1.5 text-sm">
                          {workType && (
                            <span className="text-slate-500">
                              <span className="font-medium text-slate-700">
                                Industry:
                              </span>{" "}
                              {workType}
                            </span>
                          )}
                          {locationModel && (
                            <span className="text-slate-500">
                              <span className="font-medium text-slate-700">
                                Locations:
                              </span>{" "}
                              {locationModel}
                              {locations.length > 0
                                ? ` (${locations.length})`
                                : ""}
                            </span>
                          )}
                          {deliveryModel && (
                            <span className="text-slate-500">
                              <span className="font-medium text-slate-700">
                                Delivery:
                              </span>{" "}
                              {deliveryModel}
                            </span>
                          )}
                          {approvalModel && (
                            <span className="text-slate-500">
                              <span className="font-medium text-slate-700">
                                Approval:
                              </span>{" "}
                              {approvalModel}
                            </span>
                          )}
                        </div>

                        {/* Contact line */}
                        {(contactName || companyName) && (
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                            <span>
                              {contactName && (
                                <span className="font-medium text-slate-700">
                                  {contactName}
                                </span>
                              )}
                              {contactName && companyName && (
                                <span className="mx-1">·</span>
                              )}
                              {companyName && <span>{companyName}</span>}
                              {email && <span className="ml-1">· {email}</span>}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Exposure + Coatings */}
                      <div className="px-6 py-4 border-t border-slate-100 space-y-4">
                        {/* Exposure pills */}
                        <ExposurePills
                          risks={programConfig.programProfile.exposureRisks}
                        />

                        {/* Coating pills */}
                        {(programConfig.coatingRecommendations ?? []).length >
                          0 && (
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mr-2">
                              Recommended Coatings
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {(programConfig.coatingRecommendations ?? []).map(
                                (coating: CoatingRecommendation) => (
                                  <span
                                    key={coating.id}
                                    className="inline-flex rounded-full bg-[#244093]/[0.06] border border-[#244093]/15 px-2.5 py-0.5 text-xs font-medium text-[#244093]"
                                  >
                                    {coating.label}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* Travel flag */}
                        {locations.some((l) => l.oneWayMiles > 50) && (
                          <p className="text-xs font-medium text-slate-500">
                            ⚠ Travel surcharge may apply to some locations
                          </p>
                        )}
                      </div>

                      {/* Starting point note — professional footer */}
                      <div className="px-6 py-5 border-t border-slate-100 bg-gradient-to-r from-[#244093]/[0.03] to-[#2971b5]/[0.02]">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#244093]/70 mb-1.5">
                          Your Recommended Starting Point
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          This configuration is built from your answers and
                          represents the strongest starting position for your
                          organization. Programs evolve — your OSSO specialist
                          will help you refine coverage, adjust service levels,
                          and scale the program as your workforce and compliance
                          requirements change over time.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Profile tab: program profile explanation + input-based reasoning */}
                  {activeCardSection === "profile" && (
                    <div className="p-0">
                      {/* Profile header */}
                      <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                          Your Program Profile
                        </p>
                        <div className="inline-flex rounded-full border border-[#244093]/20 bg-[#244093]/[0.06] px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-[#244093] mb-3">
                          {posture.label}
                        </div>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          {posture.explanation}
                        </p>
                      </div>

                      {/* Why you received this profile — input-based reasoning */}
                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Why you received this profile
                        </p>
                        <div className="space-y-2.5">
                          {programPosture && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Budget direction:
                                </span>{" "}
                                {programPosture}
                              </p>
                            </div>
                          )}
                          {coverageBand && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Team size:
                                </span>{" "}
                                {coverageBand} employees
                              </p>
                            </div>
                          )}
                          {locationModel && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Locations:
                                </span>{" "}
                                {locationModel}
                              </p>
                            </div>
                          )}
                          {exposureSummary && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Exposure risks:
                                </span>{" "}
                                {exposureSummary}
                              </p>
                            </div>
                          )}
                          {workType && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Industry:
                                </span>{" "}
                                {workType}
                              </p>
                            </div>
                          )}
                          {deliveryModel && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Delivery model:
                                </span>{" "}
                                {deliveryModel}
                              </p>
                            </div>
                          )}
                          {approvalModel && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Approval routing:
                                </span>{" "}
                                {approvalModel}
                              </p>
                            </div>
                          )}
                          {(programConfig.coatingRecommendations ?? []).length >
                            0 && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                →
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Recommended coatings:
                                </span>{" "}
                                {(programConfig.coatingRecommendations ?? [])
                                  .map((c: CoatingRecommendation) => c.label)
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer note */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-[#244093]/[0.03] to-[#2971b5]/[0.02]">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Your profile is derived from the full picture — team
                          size, number of locations, exposure complexity,
                          delivery structure, budget posture, and approval
                          routing. It’s not a preference you pick; it reflects
                          where your program actually sits today.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coverage tab: coverage details */}
                  {activeCardSection === "coverage" && (
                    <div className="p-0">
                      {/* Coverage metrics */}
                      <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Coverage Configuration
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              EU Package
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {selectedPackage ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Service Tier
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {serviceTier ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Coverage Band
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {coverageBand ? `${coverageBand} employees` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Why this combination */}
                      {packageTierSummary && (
                        <div className="px-6 py-4 border-t border-slate-100">
                          <p className="text-sm text-slate-500 leading-relaxed pl-4 border-l-2 border-[#2971b5]/30 italic">
                            {packageTierSummary}
                          </p>
                        </div>
                      )}

                      {/* Exposure risks */}
                      <div className="px-6 py-4 border-t border-slate-100">
                        <ExposurePills
                          risks={programConfig.programProfile.exposureRisks}
                        />
                      </div>
                    </div>
                  )}

                  {/* Coatings tab: coating recommendations */}
                  {activeCardSection === "coatings" &&
                    (programConfig.coatingRecommendations ?? []).length > 0 && (
                      <div className="p-0">
                        <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                            Recommended Coatings
                          </p>
                          <p className="text-sm text-slate-500">
                            Based on your industry and exposure profile
                          </p>
                        </div>
                        <div className="px-6 py-5 border-t border-slate-100">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(programConfig.coatingRecommendations ?? []).map(
                              (coating: CoatingRecommendation) => (
                                <div
                                  key={coating.id}
                                  className="group rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-4 transition-all hover:border-[#2971b5]/25 hover:shadow-md"
                                >
                                  <h5 className="text-sm font-semibold text-slate-800 mb-1.5 group-hover:text-[#244093] transition-colors">
                                    {coating.label}
                                  </h5>
                                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                                    {coating.description}
                                  </p>
                                  <div className="flex items-start gap-1.5">
                                    <span className="text-[#2971b5]/60 text-xs mt-px shrink-0">
                                      →
                                    </span>
                                    <p className="text-xs text-[#2971b5] font-medium leading-relaxed">
                                      {coating.reason}
                                    </p>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Logistics tab: approvals, logistics, locations */}
                  {activeCardSection === "logistics" && (
                    <div className="p-0">
                      {/* Operations overview */}
                      <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Operations & Logistics
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Work Type
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {workType ?? "Not set"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Delivery
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {deliveryModel ?? "Not set"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Approval
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {approvalModel ?? "Not set"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Location Model
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {locationModel ?? "Not set"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Program Profile
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {programPosture ?? "Not set"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Locations
                        </p>
                        {locations.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-5 text-center">
                            <p className="text-sm text-slate-500 mb-3">
                              No locations added yet. Your specialist can
                              collect these on the first call, or add them now.
                            </p>
                            <button
                              type="button"
                              onClick={openRecommendationAtLocations}
                              className={secondaryButtonClass}
                            >
                              Add Locations
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {locations.map((location, idx) => (
                              <div
                                key={`${location.label}_${idx}`}
                                className="rounded-lg border border-slate-200 bg-slate-50/40 p-3"
                              >
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                  Location {idx + 1}
                                </div>
                                {location.oneWayMiles > 50 && (
                                  <div className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded px-2 py-1 mt-1">
                                    ⚠ Potential travel surcharge
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact tab: contact info */}
                  {activeCardSection === "contact" && (
                    <div className="p-0">
                      <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Contact & Profile
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Company
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {companyName ?? "Not provided"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Safety Contact
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {contactName ?? "Not provided"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Role
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {contactRole ?? "Not provided"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Email
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {email ?? "Not provided"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Phone
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {phone ?? "Not provided"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              </div>

              {/* ── Sidebar ── */}
              <aside className="space-y-5 lg:col-span-4">
                {/* Submit Card */}
                <article className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/[0.03] via-white to-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-foreground mb-1">
                    Like what you see?
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Submit this to your OSSO specialist, or save a copy first
                    for your records.
                  </p>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={navigateToCongratulations}
                      className={`${primaryButtonClass} w-full`}
                    >
                      Submit to an OSSO Specialist →
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintOrSavePdf}
                      className={`${secondaryButtonClass} w-full`}
                    >
                      Print or Save as PDF
                    </button>
                  </div>
                  {showPrintContinue && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm text-emerald-900 font-medium mb-2">
                        Print dialog closed. Continue when you're ready.
                      </p>
                      <button
                        type="button"
                        onClick={navigateToCongratulations}
                        className={`${primaryButtonClass} w-full`}
                      >
                        Continue →
                      </button>
                    </div>
                  )}
                </article>

                {/* Interactive Checklist */}
                <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-foreground mb-1">
                    Things to gather before your call
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    No pressure on these — your specialist will help you work
                    through anything you don't have handy yet.
                  </p>
                  <div className="space-y-3">
                    <ChecklistItem>
                      Eligibility rules and replacement frequency
                    </ChecklistItem>
                    <ChecklistItem>
                      Approval path and who owns exceptions
                    </ChecklistItem>
                    <ChecklistItem>
                      Delivery preference — onsite, mail, or hybrid
                    </ChecklistItem>
                    <ChecklistItem>
                      Primary contacts per site or department
                    </ChecklistItem>
                    <ChecklistItem>
                      Locations and any scheduling constraints
                    </ChecklistItem>
                  </div>
                </article>

                {/* Trust Note */}
                <article className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      🤝
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">
                        How this process works
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {trustNote}
                      </p>
                    </div>
                  </div>
                </article>
              </aside>
            </div>
          </SectionWrap>
        </div>
      </div>

      {/* Print-only version — styled to match the OSSO program builder */}
      <div className="print-only recommendation-summary-print">
        {/* ── Brand Accent Bar ── */}
        <div className="print-brand-bar" />

        {/* ── Document Header ── */}
        <div className="print-doc-header">
          <div className="print-doc-header-left">
            <img
              src="/brand/osso/osso-logo-dark.svg"
              alt="OSSO Safety Eyewear"
              className="print-doc-logo"
            />
            <div className="print-doc-title-block">
              <h1>Program Recommendation</h1>
              <div className="print-doc-meta">
                <span>{generatedOn}</span>
                {companyName && <span>·</span>}
                {companyName && <span>{companyName}</span>}
              </div>
            </div>
          </div>
          <div className="print-doc-header-right">
            {contactName && (
              <>
                <strong>Program Contact</strong>
                {contactName}
                {contactRole ? ` · ${contactRole}` : ""}
                {email ? <br /> : null}
                {email}
                {phone ? <br /> : null}
                {phone}
              </>
            )}
          </div>
        </div>

        {/* ── Hero Banner — Package + Key Stats ── */}
        <div className="print-hero-banner">
          <div className="print-hero-banner-left">
            <span className="print-hero-label">Recommended Configuration</span>
            <span className="print-hero-title">
              {selectedPackage ?? "—"} · {serviceTier ?? "—"} Service
            </span>
          </div>
          <div className="print-hero-stats">
            {coverageBand && (
              <div className="print-hero-stat">
                <span className="print-hero-stat-value">{coverageBand}</span>
                <span className="print-hero-stat-label">Employees</span>
              </div>
            )}
            <div className="print-hero-stat">
              <span className="print-hero-stat-value">
                {posture.label.split(" ")[0]}
              </span>
              <span className="print-hero-stat-label">Profile</span>
            </div>
          </div>
        </div>

        {/* ── Program Snapshot ── */}
        <section className="print-section">
          <div className="print-section-bar">Program Snapshot</div>
          <div className="print-section-body">
            <p className="print-narrative">{revealSummary}</p>
            {packageTierSummary ? (
              <p className="print-narrative-note">{packageTierSummary}</p>
            ) : null}
            {snapshotContext ? (
              <p className="print-narrative-note">{snapshotContext}</p>
            ) : null}
          </div>
        </section>

        {/* ── Coverage & Service ── */}
        <section className="print-section">
          <div className="print-section-bar">Coverage &amp; Service</div>
          <div className="print-section-body">
            <div className="print-two-col">
              <div className="print-data-row">
                <span className="print-data-label">EU Package</span>
                <span className="print-data-value">
                  {displayValue(selectedPackage)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Service Tier</span>
                <span className="print-data-value">
                  {displayValue(serviceTier)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Coverage Band</span>
                <span className="print-data-value">
                  {coverageBand ? `${coverageBand} employees` : "Not provided"}
                </span>
              </div>
              {exposureSummary && (
                <div className="print-data-row">
                  <span className="print-data-label">Exposure Profile</span>
                  <span className="print-data-value">{exposureSummary}</span>
                </div>
              )}
            </div>

            {/* Exposure pills */}
            {(programConfig.programProfile.exposureRisks ?? []).length > 0 && (
              <>
                <div className="print-sub-heading">Exposure Risks</div>
                <div className="print-pill-row">
                  {(programConfig.programProfile.exposureRisks ?? []).map(
                    (risk) => (
                      <span key={risk} className="print-pill">
                        {exposureRiskLabel(risk)}
                      </span>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Program Profile ── */}
        <section className="print-section">
          <div className="print-section-bar">Program Profile</div>
          <div className="print-section-body">
            <div className="print-profile-badge">{posture.label}</div>
            <p className="print-narrative">{posture.explanation}</p>
            <p className="print-narrative-note">{trustNote}</p>
          </div>
        </section>

        {/* ── Recommended Coatings ── */}
        {(programConfig.coatingRecommendations ?? []).length > 0 && (
          <section className="print-section">
            <div className="print-section-bar">Recommended Coatings</div>
            <div className="print-section-body">
              {(programConfig.coatingRecommendations ?? []).map(
                (coating: CoatingRecommendation) => (
                  <div key={coating.id} className="print-coating-row">
                    <div className="print-coating-name">{coating.label}</div>
                    {coating.description && (
                      <div className="print-coating-desc">
                        {coating.description}
                      </div>
                    )}
                    <div className="print-coating-reason">
                      → {coating.reason}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {/* ── Program Guidelines ── */}
        <section className="print-section">
          <div className="print-section-bar">Program Guidelines</div>
          <div className="print-section-body">
            <div className="print-two-col">
              <div className="print-data-row">
                <span className="print-data-label">Work Type</span>
                <span className="print-data-value">
                  {displayValue(workType)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Location Model</span>
                <span className="print-data-value">
                  {displayValue(locationModel)}
                </span>
              </div>
              {programPosture && (
                <div className="print-data-row">
                  <span className="print-data-label">Budget Direction</span>
                  <span className="print-data-value">{programPosture}</span>
                </div>
              )}
              <div className="print-data-row">
                <span className="print-data-label">Delivery Model</span>
                <span className="print-data-value">
                  {displayValue(deliveryModel)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Approval Model</span>
                <span className="print-data-value">
                  {displayValue(approvalModel)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Locations ── */}
        <section className="print-section">
          <div className="print-section-bar">
            Locations{locations.length > 0 ? ` (${locations.length})` : ""}
          </div>
          <div className="print-section-body">
            {locations.length === 0 ? (
              <p className="print-narrative">
                No locations provided yet. Your OSSO specialist will collect
                site details on the first call.
              </p>
            ) : (
              locations.map((location, idx) => (
                <div
                  key={`${location.label}_${idx}`}
                  className="print-location-card"
                >
                  <div className="print-location-card-header">
                    <strong>
                      Location {idx + 1}
                      {location.label ? ` — ${location.label}` : ""}
                    </strong>
                    {location.oneWayMiles > 50 && (
                      <span>Travel surcharge may apply</span>
                    )}
                  </div>
                  {location.oneWayMiles > 0 && (
                    <div className="print-data-row">
                      <span className="print-data-label">Distance</span>
                      <span className="print-data-value">
                        {location.oneWayMiles} miles (one way)
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Contact Details ── */}
        <section className="print-section">
          <div className="print-section-bar">Contact Details</div>
          <div className="print-section-body">
            <div className="print-two-col">
              <div className="print-data-row">
                <span className="print-data-label">Company</span>
                <span className="print-data-value">
                  {displayValue(companyName)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Contact Name</span>
                <span className="print-data-value">
                  {displayValue(contactName)}
                </span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Email</span>
                <span className="print-data-value">{displayValue(email)}</span>
              </div>
              <div className="print-data-row">
                <span className="print-data-label">Phone</span>
                <span className="print-data-value">{displayValue(phone)}</span>
              </div>
              {contactRole && (
                <div className="print-data-row">
                  <span className="print-data-label">Role</span>
                  <span className="print-data-value">{contactRole}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Document Footer ── */}
        <div className="print-doc-footer">
          <span className="print-doc-footer-brand">OSSO Safety Eyewear</span>
          <span className="print-doc-footer-note">
            This recommendation is a starting point — your OSSO specialist will
            review and adjust before anything is finalized.
          </span>
        </div>
      </div>
    </section>
  );
}
