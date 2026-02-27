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
    low_budget: "Operationally Steady",
    good_budget: "Growing the Program",
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
      "Your program starts with the right foundation - a clear standard your team can actually enforce, eligibility rules employees can follow without confusion, and a service structure sized for where you are today.",
    "Compliance|Access":
      "A structured compliance baseline with enough service cadence to keep the program current as headcount grows, shifts change, or new hires come on.",
    "Comfort|Access":
      "Better fit selection and stronger adoption support built into the standard. Employees get what they need to actually wear it - which is how the program earns its value.",
    "Comfort|Premier":
      "Full adoption-focused package with the service depth to run it consistently. The right fit for environments where wear compliance matters as much as technical protection - because a pair sitting in a locker isn't protecting anyone.",
    "Complete|Access":
      "Broader coverage options and prescription flexibility for mixed-role environments, paired with service cadence that keeps access consistent without heavy coordination overhead.",
    "Complete|Premier":
      "The most common recommendation for growing programs that need performance features, mixed prescriptions, and a service structure that does not require constant manual management.",
    "Complete|Enterprise":
      "Enterprise service depth applied to a Complete package - for large or complex programs where operational support and broader coverage need to scale together without one outpacing the other.",
    "Covered|Premier":
      "Maximum configurability for organizations with multiple job functions, locations, or operating conditions - paired with Premier service so the complexity doesn't land on your team.",
    "Covered|Enterprise":
      "The full partnership model. Dedicated support, deeper governance, and a service structure built to stay consistent as your workforce, sites, and compliance requirements evolve.",
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
    return "At this size and spread, a self-serve recommendation is a map, not a blueprint. You'll be connected with a senior OSSO program specialist who will work through your site structure, compliance requirements, and rollout timeline before anything is confirmed. Nothing moves without your sign-off.";
  }

  if (
    (band === "251_500" || band === "500_plus") &&
    isMultiLocation &&
    (posture === "good_budget" || posture === "unlimited_budget")
  ) {
    return "Programs at this scale get a dedicated specialist before configuration is finalized. You'll be connected with someone who has run multi-site programs and knows where execution breaks down - so edge cases get resolved before they become your problem.";
  }

  if (band === "1_30" && hasNoFormalProgram && posture === "super_strict") {
    return "This recommendation gives you a starting point - not a finished program. A specialist will review your setup and confirm the structure fits before anything is built. For most programs at this stage, that conversation takes about 20 minutes.";
  }

  if (
    (band === "31_60" || band === "61_100" || band === "101_250") &&
    location === "single"
  ) {
    return "This recommendation is a strong starting point - not a final contract. Your OSSO program specialist will review it with you and adjust based on your site, any existing vendor relationships, and your timeline. Most programs at this size are up and running within 60 days of kickoff.";
  }

  if (band === "1_30" && location === "single" && exposureCount === 0) {
    return "For programs under 30 employees our specialist will confirm program structure fits before proceeding.";
  }

  return "This recommendation is your starting point. Your OSSO program specialist will review your profile with you and confirm the right fit before anything is finalized.";
}

function recommendationSnapshotContext(
  band: CoverageSizeBand | undefined,
  location: ProgramLocationModel | undefined,
  posture: ProgramBudgetPreference | undefined,
  setup: ProgramConfig["programProfile"]["currentSafetySetup"] = [],
) {
  const hasNoFormalProgram = (setup ?? []).includes("no_formal_program");
  if (hasNoFormalProgram && posture === "super_strict") {
    return "Starting from scratch is actually the cleanest way to build this right. Your specialist will design it around your operation, not someone else's template.";
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
    none: "Direct Access",
    manager: "Approval Required",
    centralized_safety: "Centralized Safety Approval",
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
    foundational: {
      label: "Structurally Sound",
      badgeClass: "border-sky-300 bg-sky-100 text-sky-900",
      explanation:
        "This recommendation establishes a clear compliance foundation with straightforward execution and defensible documentation. It reduces avoidable complexity, keeps standards consistent, and creates a baseline your team can rely on as demands evolve.",
      icon: "🏗️",
      accentColor: "#0ea5e9",
    },
    structured: {
      label: "Operationally Strong",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
      explanation:
        "This recommendation is tuned for momentum in day-to-day operations: faster ordering flow, less workflow friction, and reliable employee access. It helps teams move quickly while preserving the controls that keep execution consistent.",
      icon: "⚙️",
      accentColor: "#10b981",
    },
    multi_site_controlled: {
      label: "Scalable System",
      badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
      explanation:
        "This recommendation is designed to stay steady as operational demands expand. It keeps standards aligned across locations, limits exception drift, and makes execution predictable without constant intervention.",
      icon: "🗺️",
      accentColor: "#f59e0b",
    },
    enterprise_scale: {
      label: "Enterprise Grade",
      badgeClass: "border-violet-300 bg-violet-100 text-violet-900",
      explanation:
        "This recommendation delivers full-depth program support: specialist partnership, leadership-level visibility, and governance built for complex operating environments. It is designed for resilience, consistency, and long-term performance under pressure.",
      icon: "🏢",
      accentColor: "#8b5cf6",
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

  return `Based on your ${workType.toLowerCase()}, ${coverageBand}, and ${exposureSummary}, we're recommending ${packageName} with ${serviceTier} service. This combination is built to keep adoption high, reduce day-to-day friction, and hold up under audit.`;
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
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        Exposure Risks
      </div>
      <div className="flex flex-wrap gap-2">
        {props.risks.map((risk) => (
          <span
            key={risk}
            className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
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

function PrintDataRow(props: { label: string; value: string | null }) {
  return (
    <tr>
      <th scope="row">{props.label}</th>
      <td>{displayValue(props.value)}</td>
    </tr>
  );
}

// ─── NEW: Interactive Program Summary Card (replaces SVG placeholder) ───────

type SummaryCardSection =
  | "snapshot"
  | "posture"
  | "coverage"
  | "logistics"
  | "contact";

function ProgramSummaryCard(props: {
  companyName: string | null;
  contactName: string | null;
  workType: string | null;
  coverageBand: string | null;
  locationModel: string | null;
  programPosture: string | null;
  deliveryModel: string | null;
  approvalModel: string | null;
  selectedPackage: EUPackage | null;
  serviceTier: ServiceTier | null;
  postureData: ReturnType<typeof postureCard>;
  revealSummary: string;
  exposureRisks: ProgramExposureRisk[] | undefined;
  packageTierSummary: string | null;
}) {
  const [activeSection, setActiveSection] =
    useState<SummaryCardSection>("snapshot");

  const sections: Array<{
    id: SummaryCardSection;
    label: string;
    icon: string;
  }> = [
    { id: "snapshot", label: "Snapshot", icon: "📋" },
    { id: "posture", label: "Posture", icon: "🎯" },
    { id: "coverage", label: "Coverage", icon: "🛡️" },
    { id: "logistics", label: "Logistics", icon: "🔄" },
    { id: "contact", label: "Contact", icon: "👤" },
  ];

  const packageTierColors: Record<string, string> = {
    Compliance: "#0ea5e9",
    Comfort: "#10b981",
    Complete: "#f59e0b",
    Covered: "#8b5cf6",
  };

  const packageColor = props.selectedPackage
    ? (packageTierColors[props.selectedPackage] ?? "#244093")
    : "#244093";

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Card Header - Visual Program Identity */}
      <div
        className="relative p-6 pb-5 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #2971b5 0%, #4a8fd4 60%, ${packageColor}55 100%)`,
        }}
      >
        {/* Decorative geometric background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
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
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">
                  {props.companyName}
                </p>
              )}
              <h2 className="text-xl font-bold text-white leading-tight">
                Program Recommendation
              </h2>
              <p className="text-sm text-white/90 mt-1">
                Reviewed by a specialist before anything moves
              </p>
            </div>
            <div
              className="shrink-0 rounded-lg px-3 py-2 text-center"
              style={{
                backgroundColor: `${packageColor}30`,
                border: `1px solid ${packageColor}60`,
              }}
            >
              <div className="text-lg font-bold text-white">
                {props.selectedPackage ?? "—"}
              </div>
              <div className="text-[10px] font-medium text-white/60 uppercase tracking-wide">
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
      <div className="border-b border-border bg-secondary/30">
        <div className="flex overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                activeSection === section.id
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeSection === "snapshot" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {props.revealSummary}
            </p>

            {/* Package / Tier Feature Highlight */}
            {props.packageTierSummary && (
              <div
                className="rounded-lg border-l-4 bg-primary/5 p-4"
                style={{ borderLeftColor: packageColor }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: packageColor }}
                >
                  Why this combination
                </p>
                <p className="text-sm text-muted-foreground">
                  {props.packageTierSummary}
                </p>
              </div>
            )}

            {/* Exposure pills */}
            <ExposurePills risks={props.exposureRisks} />
          </div>
        )}

        {activeSection === "posture" && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: `${props.postureData.accentColor}10`,
                border: `1px solid ${props.postureData.accentColor}30`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl" aria-hidden="true">
                  {props.postureData.icon}
                </span>
                <div>
                  <div
                    className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{
                      borderColor: `${props.postureData.accentColor}50`,
                      backgroundColor: `${props.postureData.accentColor}15`,
                      color: props.postureData.accentColor,
                    }}
                  >
                    {props.postureData.label}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {props.postureData.explanation}
              </p>
            </div>

            {props.programPosture && (
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Program Posture
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {props.programPosture}
                </span>
              </div>
            )}
          </div>
        )}

        {activeSection === "coverage" && (
          <div className="space-y-3">
            {/* Package card */}
            <div className="rounded-xl overflow-hidden border border-border">
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: `${packageColor}15` }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  EU Package
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: packageColor }}
                >
                  {props.selectedPackage ?? "—"}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  Service Tier
                </span>
                <span className="text-sm font-bold text-foreground">
                  {props.serviceTier ?? "—"}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  Coverage Band
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {props.coverageBand ? `${props.coverageBand} employees` : "—"}
                </span>
              </div>
            </div>

            <ExposurePills risks={props.exposureRisks} />
          </div>
        )}

        {activeSection === "logistics" && (
          <div className="space-y-2">
            <SummaryRow
              label="Work Type"
              value={props.workType}
              showPlaceholderWhenEmpty
            />
            <SummaryRow
              label="Location Model"
              value={props.locationModel}
              showPlaceholderWhenEmpty
            />
            <SummaryRow
              label="Program Posture"
              value={props.programPosture}
              showPlaceholderWhenEmpty
            />
            <SummaryRow
              label="Delivery Model"
              value={props.deliveryModel}
              showPlaceholderWhenEmpty
            />
            <SummaryRow
              label="Approval Model"
              value={props.approvalModel}
              showPlaceholderWhenEmpty
            />
          </div>
        )}

        {activeSection === "contact" && (
          <div className="space-y-2">
            <SummaryRow
              label="Company"
              value={props.companyName}
              showPlaceholderWhenEmpty
            />
            <SummaryRow
              label="Safety Contact"
              value={props.contactName}
              showPlaceholderWhenEmpty
            />
          </div>
        )}
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
    programConfig.postureTier ?? programConfig.readinessTier ?? "foundational",
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
        {/* ── Redesigned Page Hero ── */}
        <header className="bg-gradient-to-br from-[#2971b5] via-[#4a8fd4] to-[#6baee8] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 mb-3">
                  <span aria-hidden="true">✓</span>
                  Recommendation Ready
                </div>
                <h1
                  id="recommendation-preview-title"
                  className="text-3xl font-bold tracking-tight"
                >
                  {companyName
                    ? `${companyName}'s Program Summary`
                    : "Your Program Summary"}
                </h1>
                <p className="mt-2 max-w-2xl text-white/90 text-sm">
                  Built from your inputs. An OSSO specialist reviews this before
                  anything moves forward — nothing is locked until you say so.
                </p>
              </div>
              <div className="text-xs text-white/60 mt-3 sm:mt-0 shrink-0">
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
                  contactName={contactName}
                  workType={workType}
                  coverageBand={coverageBand}
                  locationModel={locationModel}
                  programPosture={programPosture}
                  deliveryModel={deliveryModel}
                  approvalModel={approvalModel}
                  selectedPackage={selectedPackage}
                  serviceTier={serviceTier}
                  postureData={posture}
                  revealSummary={revealSummary}
                  exposureRisks={programConfig.programProfile.exposureRisks}
                  packageTierSummary={packageTierSummary}
                />

                {/* Snapshot context callout */}
                {snapshotContext && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 px-5 py-4">
                    <p className="text-sm font-semibold text-primary">
                      {snapshotContext}
                    </p>
                  </div>
                )}

                {/* Detailed Sections */}
                <article className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Coverage Section */}
                  <div className="p-5 border-b border-border">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                      Coverage Details
                    </h3>
                    <div className="space-y-1">
                      <SummaryRow
                        label="EU Package"
                        value={selectedPackage}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Service Tier"
                        value={serviceTier}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Coverage Band"
                        value={coverageBand}
                        showPlaceholderWhenEmpty
                      />
                    </div>
                    {packageTierSummary && (
                      <div className="mt-4 rounded-md border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
                        {packageTierSummary}
                      </div>
                    )}
                    <ExposurePills
                      risks={programConfig.programProfile.exposureRisks}
                    />
                  </div>

                  {/* Approvals & Logistics */}
                  <div className="p-5 border-b border-border">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                      Approvals & Logistics
                    </h3>
                    <div className="space-y-1">
                      <SummaryRow
                        label="Work Type"
                        value={workType}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Location Model"
                        value={locationModel}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Program Posture"
                        value={programPosture}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Delivery Model"
                        value={deliveryModel}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Approval Model"
                        value={approvalModel}
                        showPlaceholderWhenEmpty
                      />
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="p-5 border-b border-border">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                      Locations
                    </h3>
                    {locations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          No locations added yet. Your specialist can collect
                          these on the first call, or add them now.
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
                            className="rounded-lg border border-border bg-secondary/20 p-3"
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Location {idx + 1}
                            </div>
                            {location.oneWayMiles > 50 && (
                              <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                                ⚠ Potential travel surcharge
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-3">
                      Contact & Profile
                    </h3>
                    <div className="space-y-1">
                      <SummaryRow
                        label="Company"
                        value={companyName}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Safety Contact"
                        value={contactName}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Role"
                        value={contactRole}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Email"
                        value={email}
                        showPlaceholderWhenEmpty
                      />
                      <SummaryRow
                        label="Phone"
                        value={phone}
                        showPlaceholderWhenEmpty
                      />
                    </div>
                  </div>
                </article>
              </div>

              {/* ── Sidebar ── */}
              <aside className="space-y-5 lg:col-span-4">
                {/* Submit Card */}
                <article className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-5">
                  <h2 className="text-base font-bold text-foreground mb-1">
                    Ready to move forward?
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Submit this recommendation to an OSSO specialist, or save a
                    copy for your records.
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
                <article className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-sm font-bold text-foreground mb-1">
                    Before your specialist call
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Check these off as you gather them — your OSSO specialist
                    will work through everything with you.
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
                <article className="rounded-xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      🤝
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">
                        A note on how this works
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

      {/* Print-only version (unchanged) */}
      <div className="print-only recommendation-summary-print">
        <header className="print-header">
          <img
            src="/brand/osso/osso-logo-horizontal.png"
            alt="OSSO logo"
            className="print-logo"
          />
          <div className="print-header-copy">
            <h1>Program Recommendation Summary</h1>
            <p>Generated on {generatedOn}</p>
            <p>Company: {displayValue(companyName)}</p>
          </div>
        </header>

        <section className="print-section">
          <h2>Program snapshot</h2>
          <p>{revealSummary}</p>
          {snapshotContext ? (
            <p className="print-note">{snapshotContext}</p>
          ) : null}
        </section>

        <section className="print-section">
          <h2>Program posture and rationale</h2>
          <p>
            <strong>{posture.label}.</strong> {posture.explanation}
          </p>
          <p className="print-note">{trustNote}</p>
        </section>

        <section className="print-section">
          <h2>Coverage</h2>
          <table>
            <tbody>
              <PrintDataRow label="EU Package" value={selectedPackage} />
              <PrintDataRow label="Service Tier" value={serviceTier} />
              <PrintDataRow label="Coverage Band" value={coverageBand} />
              <PrintDataRow label="Exposure Profile" value={exposureSummary} />
            </tbody>
          </table>
          {packageTierSummary ? (
            <p className="print-note">{packageTierSummary}</p>
          ) : null}
        </section>

        <section className="print-section">
          <h2>Approvals and logistics</h2>
          <table>
            <tbody>
              <PrintDataRow label="Work Type" value={workType} />
              <PrintDataRow label="Location Model" value={locationModel} />
              <PrintDataRow label="Program Posture" value={programPosture} />
              <PrintDataRow label="Delivery Model" value={deliveryModel} />
              <PrintDataRow label="Approval Model" value={approvalModel} />
            </tbody>
          </table>
        </section>

        <section className="print-section">
          <h2>Locations</h2>
          {locations.length === 0 ? (
            <p>Not provided</p>
          ) : (
            <table>
              <tbody>
                {locations.map((location, idx) => (
                  <tr key={`${location.label}_${idx}`}>
                    <th scope="row">Location {idx + 1}</th>
                    <td>
                      {location.oneWayMiles > 50
                        ? "Potential travel surcharge"
                        : "No travel surcharge flagged"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="print-section">
          <h2>Contact and profile</h2>
          <table>
            <tbody>
              <PrintDataRow label="Company" value={companyName} />
              <PrintDataRow label="Safety Contact" value={contactName} />
              <PrintDataRow label="Role" value={contactRole} />
              <PrintDataRow label="Email" value={email} />
              <PrintDataRow label="Phone" value={phone} />
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
