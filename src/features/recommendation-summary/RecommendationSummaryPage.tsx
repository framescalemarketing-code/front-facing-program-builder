"use client";

import { useEffect, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { isValidEmailFormat, formatPhoneAsUs } from "@/lib/contactValidation";
import {
  defaultDraft,
  type EUPackage,
  type ServiceTier,
} from "@/lib/programDraft";
import {
  deriveProgramConfigFromDraft,
  type ProgramBudgetPreference,
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
    "1_50": "1 to 50",
    "51_100": "51 to 100",
    "101_200": "101 to 200",
    "201_plus": "200+",
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
      "This recommendation sets a clear compliance-ready standard with a service structure sized for a smaller, more direct operating model. It focuses on consistent eligibility, straightforward ordering, and a manageable support path for a single program owner or a small team.",
    "Compliance|Access":
      "This recommendation keeps a compliance-focused package in place while adding more support structure for ongoing onboarding, replacements, and policy consistency as the program becomes more active.",
    "Comfort|Access":
      "This recommendation adds a broader package and a stronger day-to-day service structure for teams that need more fit flexibility, repeatable support, and a steadier operating rhythm across the workforce.",
    "Comfort|Premier":
      "This recommendation pairs a broader package with higher-touch service support for programs showing stronger coordination needs, more structured delivery, and a deeper partnership model.",
    "Complete|Access":
      "This recommendation supports more complex role coverage and higher product needs while keeping service operations structured enough to manage approvals, replacements, and fulfillment reliably.",
    "Complete|Premier":
      "This recommendation is structured for programs that need both deeper package coverage and a true partnership-level service model across teams, locations, and more formal operating workflows.",
    "Covered|Partnered":
      "This represents enterprise-level coverage governance and full partnership operations, and is only considered when your specialist confirms advanced multi-region and policy-governance requirements.",
  };
  return map[`${euPackage}|${serviceTier}`] ?? null;
}

function packageTierFitDetails(
  euPackage: EUPackage | null,
  serviceTier: ServiceTier | null,
) {
  if (!euPackage || !serviceTier) {
    return {
      title: "How this fit is determined",
      body: "This recommendation combines package depth and service structure based on your team size, locations, hazards, setup, and budget goals.",
    };
  }

  const map: Record<string, { title: string; body: string }> = {
    "Compliance|Essential": {
      title: "Who this combination is for",
      body: "This fit is for smaller or early-stage programs that need clear compliance standards with a straightforward service model. It keeps requirements clear while supporting predictable day-to-day execution.",
    },
    "Compliance|Access": {
      title: "Who this combination is for",
      body: "This fit is for teams that still prioritize a compliance-first package but need stronger ongoing service support as onboarding, replacements, and coordination demands increase.",
    },
    "Comfort|Access": {
      title: "Who this combination is for",
      body: "This fit is for teams that need broader package flexibility and a structured service model to support recurring operations across supervisors, shifts, or growing headcount.",
    },
    "Comfort|Premier": {
      title: "Who this combination is for",
      body: "This fit is for programs with stronger coordination demands that need higher-touch support while still using the Comfort package depth for daily operational requirements.",
    },
    "Complete|Access": {
      title: "Who this combination is for",
      body: "This fit is for teams with higher coverage complexity that need deeper package support while managing service through a structured, repeatable Access model.",
    },
    "Complete|Premier": {
      title: "Who this combination is for",
      body: "This fit is for programs with both high package complexity and partnership-level service needs across locations, workflows, and ongoing governance requirements.",
    },
    "Covered|Partnered": {
      title: "Who this combination is for",
      body: "This fit is reserved for mature enterprise programs with high policy rigor, multi-region oversight, and sustained specialist-led governance across locations.",
    },
  };

  return map[`${euPackage}|${serviceTier}`] ?? {
    title: "How this fit is determined",
    body: "This recommendation combines package depth and service structure based on your team size, locations, hazards, setup, and budget goals.",
  };
}

// NOTE: Upgrade paths moved out of snapshot view. Function removed but kept here for reference if needed in future.
// The upgrade paths explanations are no longer displayed in the quick snapshot view.

function trustNoteVariant(
  _band: CoverageSizeBand | undefined,
  _location: ProgramLocationModel | undefined,
  _posture?: ProgramBudgetPreference,
  _setup: ProgramConfig["programProfile"]["currentSafetySetup"] = [],
  _exposureCount = 0,
): string {
  return "After you submit, our team receives your recommendation and assigns it to a Program specialist. You will receive a response within 48 hours to review your inputs, confirm details, and finalize next steps. Please have the checklist items ready or answered before that conversation.";
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

function packageFitBySelection(args: {
  selectedPackage: EUPackage | null;
  workType: string | null;
  coverageBand: string | null;
  locationModel: string | null;
  exposureSummary: string | null;
  deliveryModel: string | null;
  approvalModel: string | null;
  budgetGoals: string | null;
  coatings: CoatingRecommendation[];
}) {
  const pkg = args.selectedPackage ?? "This package";
  const rows: { label: string; detail: string }[] = [];

  if (args.workType) {
    rows.push({
      label: "Industry",
      detail: `${pkg} aligns to ${args.workType} environments, which typically require consistent protection depth and clear eligibility standards for day-to-day operations.`,
    });
  }
  if (args.coverageBand) {
    rows.push({
      label: "Team size",
      detail: `With ${args.coverageBand} employees to cover, ${pkg} provides the right level of role flexibility — not over-engineered for small teams, not too restrictive for growing headcount.`,
    });
  }
  if (args.locationModel) {
    rows.push({
      label: "Locations",
      detail: `Your ${args.locationModel.toLowerCase()} structure was a factor in recommending ${pkg} — ${args.locationModel.toLowerCase().includes("multiple") ? "multi-site programs need consistent package standards across sites" : "single-site programs can rely on a tightly standardized package without excess complexity"}.`,
    });
  }
  if (args.exposureSummary) {
    rows.push({
      label: "Exposure risks",
      detail: `Your selected exposure risks (${args.exposureSummary}) indicate the protection depth that ${pkg} is designed to meet — this isn't a one-size guess, it reflects what your team actually faces.`,
    });
  }
  if (args.deliveryModel || args.approvalModel) {
    const logistics = [args.deliveryModel, args.approvalModel]
      .filter(Boolean)
      .join(" and ");
    rows.push({
      label: "Setup and logistics",
      detail: `Your current setup (${logistics}) is compatible with how ${pkg} is deployed — coverage depth and service execution stay aligned without requiring major process changes.`,
    });
  }
  if (args.budgetGoals) {
    rows.push({
      label: "Budget goals",
      detail: `${pkg} fits your stated budget priority of "${args.budgetGoals}" — the coverage depth doesn't exceed what your current planning supports, and it protects long-term consistency.`,
    });
  }
  if (args.coatings.length > 0) {
    rows.push({
      label: "Coatings",
      detail: `The coatings selected from your inputs (${args.coatings.map((c) => c.label).join(", ")}) are compatible with ${pkg} and extend lens durability and wear comfort in your environment.`,
    });
  }
  return rows;
}

function serviceFitBySelection(args: {
  serviceTier: ServiceTier | null;
  coverageBand: string | null;
  locationModel: string | null;
  workType: string | null;
  exposureSummary: string | null;
  deliveryModel: string | null;
  approvalModel: string | null;
  budgetGoals: string | null;
}) {
  const svc = args.serviceTier ?? "This service tier";
  const rows: { label: string; detail: string }[] = [];

  if (args.coverageBand) {
    rows.push({
      label: "Team coordination",
      detail: `With ${args.coverageBand} employees to support, ${svc} provides enough service capacity to handle onboarding, reorders, and exception management without creating a bottleneck.`,
    });
  }
  if (args.locationModel) {
    rows.push({
      label: "Location coordination",
      detail: `Your ${args.locationModel.toLowerCase()} setup drives the coordination load. ${svc} is structured to match that — ${args.locationModel.toLowerCase().includes("multiple") ? "distributed programs need reliable cross-site service routing" : "a single site can be supported with a more direct service model"}.`,
    });
  }
  if (args.workType) {
    rows.push({
      label: "Industry operations",
      detail: `${args.workType} environments have specific service cadence needs. ${svc} keeps support workflows practical for how your team actually operates day-to-day.`,
    });
  }
  if (args.exposureSummary) {
    rows.push({
      label: "Risk support",
      detail: `Your selected exposures (${args.exposureSummary}) introduce replacement and eligibility complexity that ${svc} is calibrated to absorb without putting that burden back on your team.`,
    });
  }
  if (args.deliveryModel || args.approvalModel) {
    const logistics = [args.deliveryModel, args.approvalModel]
      .filter(Boolean)
      .join(" and ");
    rows.push({
      label: "Execution workflow",
      detail: `Your current ${logistics} setup determines how service is triggered and tracked. ${svc} is a fit for this workflow — it supports your execution model without over-engineering it.`,
    });
  }
  if (args.budgetGoals) {
    rows.push({
      label: "Budget alignment",
      detail: `${svc} fits your budget direction of "${args.budgetGoals}" — service depth is matched to what your current program model can sustain operationally.`,
    });
  }
  return rows;
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

// --- NEW: Interactive Program Summary Card (replaces SVG placeholder) -------

type SummaryCardSection =
  | "snapshot"
  | "profile"
  | "coverage"
  | "coatings"
  | "logistics";

function ProgramSummaryCard(props: {
  companyName: string | null;
  workType: string | null;
  coverageBand: string | null;
  locationModel: string | null;
  selectedPackage: EUPackage | null;
  serviceTier: ServiceTier | null;
  hasCoatings: boolean;
  unlocked: boolean;
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
    { id: "snapshot", label: "Snapshot", icon: "◈" },
    { id: "profile", label: "Profile", icon: "◎" },
    { id: "coverage", label: "Coverage", icon: "▣" },
    ...(props.hasCoatings
      ? [
          {
            id: "coatings" as SummaryCardSection,
            label: "Coatings",
            icon: "✦",
          },
        ]
      : []),
    { id: "logistics", label: "Logistics", icon: "⌂" },
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
            <div className="flex gap-2 shrink-0">
              <div className="rounded-lg px-3 py-2 text-center backdrop-blur-sm bg-white/15 border border-white/25 shadow-lg min-w-[72px]">
                <div className="text-lg font-bold text-white leading-tight">
                  {props.selectedPackage ?? "—"}
                </div>
                <div className="text-[10px] font-medium text-white/60 uppercase tracking-wide mt-0.5">
                  EU Package
                </div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center backdrop-blur-sm bg-white/15 border border-white/25 shadow-lg min-w-[72px]">
                <div className="text-lg font-bold text-white leading-tight">
                  {props.serviceTier ?? "—"}
                </div>
                <div className="text-[10px] font-medium text-white/60 uppercase tracking-wide mt-0.5">
                  Service Tier
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stat Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {props.workType && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">▤</span> {props.workType}
              </span>
            )}
            {props.coverageBand && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">◷</span> {props.coverageBand}{" "}
                employees
              </span>
            )}
            {props.locationModel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <span aria-hidden="true">⌂</span> {props.locationModel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <div className="border-b border-slate-200 bg-slate-50/60">
        <div className="flex overflow-x-auto no-scrollbar">
          {sections.map((section) => {
            const isLocked = !props.unlocked && section.id !== "snapshot";
            return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                if (isLocked) return;
                setActiveSection(section.id);
              }}
              disabled={isLocked}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-all border-b-2 ${
                activeSection === section.id
                  ? "border-primary text-primary bg-white shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.label}
              {isLocked ? " [Locked]" : ""}
            </button>
          );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Checklist Item ---------------------------------------------------------

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

// --- Main Page ---------------------------------------------------------------

export function RecommendationSummaryPage({
  onNavigate,
}: {
  onNavigate: NavigateFn;
}) {
  const { draft, updateDraft } = useProgramDraft();
  const program = draft?.program ?? defaultDraft.program;
  const activeConfig = draft?.programConfig?.active;
  const programConfig: ProgramConfig =
    activeConfig &&
    typeof activeConfig === "object" &&
    "programConfigVersion" in (activeConfig as Record<string, unknown>)
      ? (activeConfig as ProgramConfig)
      : deriveProgramConfigFromDraft(draft ?? defaultDraft);

  const companyName =
    nonEmpty(programConfig.company.companyName) ??
    nonEmpty(draft?.program.contact.companyName);
  const contactName = nonEmpty(programConfig.company.contactName);
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
  const packageTierFit = packageTierFitDetails(selectedPackage, serviceTier);
  // const upgradePath = upgradePathDetails(programConfig.upgradeOptions);  // Upgrade paths moved out of snapshot view
  const trustNote = trustNoteVariant(
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel,
    programConfig.programProfile.budgetPreference,
    programConfig.programProfile.currentSafetySetup,
    programConfig.programProfile.exposureRisks?.length ?? 0,
  );

  const locations = program.locations ?? [];
  const firstLocation = locations[0];
  const afterPrintRestoreRef = useRef<Window["onafterprint"]>(null);
  const [intake, setIntake] = useState({
    companyName: draft?.program.contact.companyName ?? "",
    fullName: draft?.program.contact.fullName ?? "",
    role: draft?.program.contact.role ?? "",
    email: draft?.program.contact.email ?? "",
    phone: draft?.program.contact.phone ?? "",
    locationLabel: firstLocation?.label ?? "",
    locationCity: firstLocation?.city ?? "",
    locationState: firstLocation?.state ?? "",
    locationZip: firstLocation?.zipCode ?? "",
  });
  const [extraAddresses, setExtraAddresses] = useState<
    Array<{ street: string; city: string; state: string; zip: string }>
  >(() =>
    locations.slice(1).map((loc) => ({
      street: loc.streetAddress ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      zip: loc.zipCode ?? "",
    }))
  );
  const [activeCardSection, setActiveCardSection] =
    useState<SummaryCardSection>("snapshot");

  const hasContactInfo =
    intake.companyName.trim().length > 0 &&
    intake.fullName.trim().length > 0 &&
    intake.email.trim().length > 0 &&
    isValidEmailFormat(intake.email.trim()) &&
    intake.phone.trim().length > 0;
  const hasLocationInfo =
    intake.locationLabel.trim().length > 0 &&
    intake.locationCity.trim().length > 0 &&
    intake.locationState.trim().length > 0 &&
    intake.locationZip.trim().length > 0;
  const isIntakeComplete = hasContactInfo && hasLocationInfo;

  const coverageSections = packageFitBySelection({
    selectedPackage,
    workType,
    coverageBand,
    locationModel,
    exposureSummary,
    deliveryModel,
    approvalModel,
    budgetGoals: programPosture,
    coatings: programConfig.coatingRecommendations ?? [],
  });
  const serviceSections = serviceFitBySelection({
    serviceTier,
    coverageBand,
    locationModel,
    workType,
    exposureSummary,
    deliveryModel,
    approvalModel,
    budgetGoals: programPosture,
  });
  const hasCoveredUpgrade = programConfig.upgradeOptions?.euPackage === "Covered";
  const hasPartneredUpgrade =
    programConfig.upgradeOptions?.serviceTier === "Partnered";

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

  useEffect(() => {
    if (!isIntakeComplete && activeCardSection !== "snapshot") {
      setActiveCardSection("snapshot");
    }
  }, [activeCardSection, isIntakeComplete]);

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

    afterPrintRestoreRef.current = window.onafterprint;
    window.onafterprint = () => {
      const restore = afterPrintRestoreRef.current;
      afterPrintRestoreRef.current = null;
      window.onafterprint = restore;
      navigateToCongratulations();
    };

    window.print();
  }

  function formatPhoneNumber(input: string): string {
    // Use the existing phone formatter from contactValidation
    return formatPhoneAsUs(input);
  }

  function handleIntakeFieldChange(
    key: keyof typeof intake,
    value: string,
  ) {
    // Apply phone formatting if this is the phone field
    const finalValue = key === "phone" ? formatPhoneNumber(value) : value;
    setIntake((prev) => ({ ...prev, [key]: finalValue }));
  }

  function saveIntakeAndUnlock() {
    if (!isIntakeComplete) return;
    const nextLocations = [...locations];
    const baseLocation =
      nextLocations[0] ??
      defaultDraft.program.locations[0] ?? {
        label: "Location 1",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        additionalOnsiteVisits: 0,
        oneWayMiles: 0,
        oneWayMinutes: 0,
        autoDistance: true,
        status: "idle" as const,
        statusMessage: "",
      };
    nextLocations[0] = {
      ...baseLocation,
      label: intake.locationLabel.trim(),
      city: intake.locationCity.trim(),
      state: intake.locationState.trim(),
      zipCode: intake.locationZip.trim(),
    };

    updateDraft({
      program: {
        contact: {
          companyName: intake.companyName.trim(),
          fullName: intake.fullName.trim(),
          role: intake.role.trim(),
          email: intake.email.trim(),
          phone: intake.phone.trim(),
        },
        locations: nextLocations,
      },
    });
  }

  function handleExtraAddressChange(
    idx: number,
    field: "street" | "city" | "state" | "zip",
    value: string,
  ) {
    setExtraAddresses((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function saveExtraAddresses() {
    const nextLocations = [...locations];
    extraAddresses.forEach((addr, i) => {
      const existing = nextLocations[i + 1];
      if (!existing) return;
      nextLocations[i + 1] = {
        ...existing,
        streetAddress: addr.street.trim(),
        city: addr.city.trim(),
        state: addr.state.trim(),
        zipCode: addr.zip.trim(),
      };
    });
    updateDraft({ program: { locations: nextLocations } });
  }

  return (
    <section aria-labelledby="recommendation-preview-title">
      <div data-pdf-exclude="true">
        {/* -- Clean Page Hero -- */}
        <header className="border-b border-gray-200/60 bg-white">
          <div
            className="h-1 bg-linear-to-r from-[#2971b5] via-[#5e97dd] to-[#2971b5]"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-3">
                  <span aria-hidden="true">OK</span>
                  Recommendation Ready
                </div>
                <h1
                  id="recommendation-preview-title"
                  className="text-4xl font-extrabold tracking-tight text-gray-900"
                >
                  {companyName
                    ? `${companyName}'s Program Recommendation Summary`
                    : "Program Recommendation Summary"}
                </h1>
                <p className="mt-2 max-w-2xl text-gray-500 text-sm">
                  This is a recommendation, not a commitment. Review the snapshot first, then unlock the full recommendation experience by completing the intake below.
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
                Back to Recommendation
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
              {/* -- Main column -- */}
              <div className="lg:col-span-8 space-y-6">
                {/* Interactive Program Summary Card replacing the SVG placeholder */}
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
                  unlocked={isIntakeComplete}
                  activeSection={activeCardSection}
                  onSectionChange={setActiveCardSection}
                />

                {/* Detailed Sections driven by active tab */}
                <article className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  {/* Snapshot: the full picture at a glance */}
                  {activeCardSection === "snapshot" && (
                    <div className="p-0">
                      <div className="px-6 py-6 border-t border-slate-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              EU Package
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {selectedPackage ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Service Tier
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {serviceTier ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Coverage
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {coverageBand ? `${coverageBand} employees` : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Fit Overview
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {selectedPackage && serviceTier
                                ? `${selectedPackage} + ${serviceTier}`
                                : "Package and tier pending"}
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
                                <span className="mx-1">|</span>
                              )}
                              {companyName && <span>{companyName}</span>}
                              {email && <span className="ml-1">| {email}</span>}
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
                                    className="inline-flex rounded-full bg-[#244093]/6 border border-[#244093]/15 px-2.5 py-0.5 text-xs font-medium text-[#244093]"
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
                    </div>
                  )}

                  {/* Profile tab: package+tier explanation + input-based reasoning */}
                  {activeCardSection === "profile" && (
                    <div className="p-0">
                      {/* Fit header */}
                      <div className="px-6 pt-6 pb-5 bg-linear-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                          EU Package and Service Tier Fit
                        </p>
                        <div className="inline-flex rounded-full border border-[#244093]/20 bg-[#244093]/6 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-[#244093] mb-3">
                          {selectedPackage && serviceTier
                            ? `${selectedPackage} + ${serviceTier}`
                            : "Package and Tier Pending"}
                        </div>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          {packageTierFit.body}
                        </p>
                      </div>

                      {/* Why you received this fit based on your inputs */}
                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          {packageTierFit.title}
                        </p>
                        <div className="space-y-2.5">
                          {programPosture && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                -
                              </span>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-medium text-slate-700">
                                  Budget goals:
                                </span>{" "}
                                {programPosture}
                              </p>
                            </div>
                          )}
                          {coverageBand && (
                            <div className="flex items-start gap-2.5">
                              <span className="text-[#2971b5]/60 text-xs mt-0.5 shrink-0">
                                -
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
                                -
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
                                -
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
                                -
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
                                -
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
                                -
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
                                -
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
                      <div className="px-6 py-4 border-t border-slate-100 bg-linear-to-r from-[#244093]/3 to-[#2971b5]/2">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          This fit is built from the full picture: team size, locations, exposure complexity, delivery structure, budget goals, and approval routing. It shows how the EU Package and Service Tier align to your current operating model.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coverage tab: coverage details */}
                  {activeCardSection === "coverage" && (
                    <div className="p-0">
                      {/* Coverage metrics */}
                      <div className="px-6 pt-6 pb-5 bg-linear-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Coverage Configuration
                        </p>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                          Coverage explains how package depth and service structure align to your current exposure mix, workforce size, and operating responsibilities.
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              EU Package
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {selectedPackage ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Service Tier
                            </span>
                            <span className="text-lg font-bold text-[#244093]">
                              {serviceTier ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Coverage Band
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {coverageBand ? `${coverageBand} employees` : "-"}
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

                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Why This EU Package Fits
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {coverageSections.map((row) => (
                            <div
                              key={row.label}
                              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-2.5"
                            >
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24 pt-0.5">
                                {row.label}
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {row.detail}
                              </p>
                            </div>
                          ))}
                        </div>
                        {hasCoveredUpgrade && (
                          <div className="mt-4 rounded-lg border border-[#244093]/20 bg-linear-to-br from-[#244093]/6 via-white to-[#244093]/3 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#244093] mb-1">
                              You May Also Need This
                            </p>
                            <h5 className="text-sm font-bold text-slate-900 mb-1">
                              Covered Package Signal
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Your selections show enterprise-level signals where the Covered package may unlock a higher level of policy control, role-based tailoring, and customization depth.
                            </p>
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                              If you want to explore high-end configuration options, a Program Specialist can walk you through what Covered looks like for your exact team structure.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={primaryButtonClass}
                              >
                                Covered
                              </button>
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={secondaryButtonClass}
                              >
                                Talk to a Program Specialist
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Why This Service Tier Fits
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {serviceSections.map((row) => (
                            <div
                              key={row.label}
                              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-2.5"
                            >
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24 pt-0.5">
                                {row.label}
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {row.detail}
                              </p>
                            </div>
                          ))}
                        </div>
                        {hasPartneredUpgrade && (
                          <div className="mt-4 rounded-lg border border-[#244093]/20 bg-linear-to-br from-[#244093]/6 via-white to-[#244093]/3 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#244093] mb-1">
                              You May Also Need This
                            </p>
                            <h5 className="text-sm font-bold text-slate-900 mb-1">
                              Partnered Service Signal
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Your inputs suggest a level of operational complexity where the Partnered tier may be a better long-term fit for governance, service continuity, and advanced customization support.
                            </p>
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                              If you want to learn what a high-touch Partnered model can look like for your organization, connect with a Program Specialist.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={primaryButtonClass}
                              >
                                Partnered
                              </button>
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={secondaryButtonClass}
                              >
                                Talk to a Program Specialist
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Coatings tab: coating recommendations */}
                  {activeCardSection === "coatings" &&
                    (programConfig.coatingRecommendations ?? []).length > 0 && (
                      <div className="p-0">
                        <div className="px-6 pt-6 pb-5 bg-linear-to-br from-slate-50 via-white to-slate-50/80">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                            Recommended Coatings
                          </p>
                          <p className="text-sm text-slate-500">
                            Each coating below is specific to an exposure or condition you selected. The reason explains exactly why it applies to your program.
                          </p>
                        </div>
                        <div className="px-6 py-5 border-t border-slate-100 space-y-3">
                          {(programConfig.coatingRecommendations ?? []).map(
                            (coating: CoatingRecommendation) => (
                              <div
                                key={coating.id}
                                className="rounded-lg border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h5 className="text-sm font-bold text-slate-800">
                                    {coating.label}
                                  </h5>
                                </div>
                                <p className="text-xs font-medium text-[#244093] leading-relaxed">
                                  {coating.reason}
                                </p>
                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                  {coating.description}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Logistics tab: approvals, logistics, locations */}
                  {activeCardSection === "logistics" && (
                    <div className="p-0">
                      {/* Operations overview */}
                      <div className="px-6 pt-6 pb-5 bg-linear-to-br from-slate-50 via-white to-slate-50/80">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Current Logistics and Operations
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                              Industry
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
                              Budget Goals
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
                                  {location.label || `Location ${idx + 1}`}
                                </div>
                                {[location.streetAddress, location.city, location.state, location.zipCode].filter(Boolean).length > 0 && (
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    {[location.streetAddress, location.city, location.state, location.zipCode].filter(Boolean).join(", ")}
                                  </p>
                                )}
                                {location.oneWayMiles > 50 && (
                                  <div className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded px-2 py-1 mt-1">
                                    ⚠ Potential travel surcharge
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Additional location addresses — shown after intake is unlocked */}
                        {isIntakeComplete && locations.length > 1 && (
                          <div className="mt-4 space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                              Additional Location Addresses
                            </p>
                            {locations.slice(1).map((loc, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-slate-200 bg-slate-50/40 p-3"
                              >
                                <p className="text-xs font-bold text-slate-600 mb-2">
                                  {loc.label || `Location ${i + 2}`}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Street address
                                    <input
                                      value={extraAddresses[i]?.street ?? ""}
                                      onChange={(e) =>
                                        handleExtraAddressChange(i, "street", e.target.value)
                                      }
                                      placeholder="e.g., 123 Industrial Dr"
                                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                  </label>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    City
                                    <input
                                      value={extraAddresses[i]?.city ?? ""}
                                      onChange={(e) =>
                                        handleExtraAddressChange(i, "city", e.target.value)
                                      }
                                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                    />
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      State
                                      <input
                                        type="text"
                                        list="us-states-list"
                                        value={extraAddresses[i]?.state ?? ""}
                                        onChange={(e) =>
                                          handleExtraAddressChange(i, "state", e.target.value)
                                        }
                                        placeholder="CA"
                                        maxLength={2}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 uppercase"
                                      />
                                    </label>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Zip
                                      <input
                                        value={extraAddresses[i]?.zip ?? ""}
                                        onChange={(e) =>
                                          handleExtraAddressChange(i, "zip", e.target.value)
                                        }
                                        placeholder="90210"
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={saveExtraAddresses}
                              className={secondaryButtonClass}
                            >
                              Save additional addresses
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Per-location program structure — shown for multi-site */}
                      {programConfig.locationRecommendations &&
                        programConfig.locationRecommendations.length > 0 && (
                          <div className="px-6 py-5 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Per-Location Program Structure
                              </p>
                              <span className="inline-flex items-center rounded-full bg-[#244093]/8 border border-[#244093]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#244093]">
                                Multi-Site
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              Each of your locations is structured as its own
                              program entity and cost center. The recommendation
                              below applies per location, and your specialist will
                              confirm final program details for each site on
                              the first call.
                            </p>
                            {locations.length > 0 ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {locations.map((location, idx) => (
                                  <div
                                    key={`loc-rec-${idx}`}
                                    className="rounded-lg border border-[#244093]/15 bg-linear-to-br from-[#244093]/4 to-white p-4"
                                  >
                                    <p className="text-xs font-bold text-[#244093] mb-2">
                                      {location.label || `Location ${idx + 1}`}
                                    </p>
                                    <div className="flex gap-4">
                                      <div>
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                                          Package
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">
                                          {selectedPackage ?? "—"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                                          Service Tier
                                        </span>
                                        <span className="text-sm font-bold text-slate-800">
                                          {serviceTier ?? "—"}
                                        </span>
                                      </div>
                                    </div>
                                    {location.oneWayMiles > 50 && (
                                      <p className="text-xs font-medium text-slate-500 mt-2">
                                        ⚠ Travel surcharge may apply
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-[#244093]/15 bg-linear-to-br from-[#244093]/4 to-white p-4">
                                <p className="text-xs font-bold text-[#244093] mb-2">
                                  Per Location
                                </p>
                                <div className="flex gap-4">
                                  <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                                      Package
                                    </span>
                                    <span className="text-sm font-bold text-slate-800">
                                      {selectedPackage ?? "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-0.5">
                                      Service Tier
                                    </span>
                                    <span className="text-sm font-bold text-slate-800">
                                      {serviceTier ?? "—"}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  Add your locations above and this will show
                                  a card per site.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}

                </article>

                <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">
                    Your Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Complete your contact and location details below.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company name
                      <input
                        value={intake.companyName}
                        onChange={(event) =>
                          handleIntakeFieldChange("companyName", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact name
                      <input
                        value={intake.fullName}
                        onChange={(event) =>
                          handleIntakeFieldChange("fullName", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                      <input
                        value={intake.role}
                        onChange={(event) =>
                          handleIntakeFieldChange("role", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                      <input
                        value={intake.email}
                        onChange={(event) =>
                          handleIntakeFieldChange("email", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                      <input
                        value={intake.phone}
                        onChange={(event) =>
                          handleIntakeFieldChange("phone", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company address
                      <input
                        type="text"
                        value={intake.locationLabel}
                        onChange={(event) =>
                          handleIntakeFieldChange("locationLabel", event.target.value)
                        }
                        placeholder="e.g., 123 Main St, Building A"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      City
                      <input
                        value={intake.locationCity}
                        onChange={(event) =>
                          handleIntakeFieldChange("locationCity", event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        State
                        <input
                          type="text"
                          list="us-states-list"
                          value={intake.locationState}
                          onChange={(event) =>
                            handleIntakeFieldChange("locationState", event.target.value)
                          }
                          placeholder="e.g., CA"
                          maxLength={2}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 uppercase"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Zip
                        <input
                          type="text"
                          value={intake.locationZip}
                          onChange={(event) =>
                            handleIntakeFieldChange("locationZip", event.target.value)
                          }
                          placeholder="e.g., 90210"
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        />
                      </label>
                    </div>
                    {/* Hidden datalist for state autocomplete */}
                    <datalist id="us-states-list">
                      {["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
                        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map((state) => (
                        <option key={state} value={state} />
                      ))}
                    </datalist>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={saveIntakeAndUnlock}
                      disabled={!isIntakeComplete}
                      className={primaryButtonClass}
                    >
                      Save intake and unlock tabs
                    </button>
                  </div>
                </article>
              </div>

              {/* -- Sidebar -- */}
              <aside className="space-y-5 lg:col-span-4">
                {isIntakeComplete ? (
                  <>
                    <article className="rounded-xl border border-primary/20 bg-linear-to-b from-primary/3 via-white to-white p-5 shadow-sm">
                      <h2 className="text-base font-bold text-foreground mb-1">
                        Finalize Recommendation
                      </h2>
                      <p className="text-xs text-muted-foreground mb-4">
                        You can now print or save this recommendation as PDF, or submit directly to a Program specialist.
                      </p>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={navigateToCongratulations}
                          className={`${primaryButtonClass} w-full`}
                        >
                          Submit to a Program Specialist
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintOrSavePdf}
                          className={`${secondaryButtonClass} w-full`}
                        >
                          Print or Save as PDF
                        </button>
                      </div>
                    </article>

                    <article className="rounded-xl border border-slate-200/80 bg-linear-to-br from-slate-50 to-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0" aria-hidden="true">
                          ℹ
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

                    <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                      <h2 className="text-sm font-bold text-foreground mb-1">
                        Things to gather before your call
                      </h2>
                      <p className="text-xs text-muted-foreground mb-4">
                        Your Program specialist will help you work
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
                          Delivery preference: onsite, mail, or hybrid
                        </ChecklistItem>
                        <ChecklistItem>
                          Primary contacts per site or department
                        </ChecklistItem>
                        <ChecklistItem>
                          Locations and any scheduling constraints
                        </ChecklistItem>
                      </div>
                    </article>
                  </>
                ) : (
                  <article className="rounded-xl border border-slate-200/80 bg-slate-50 p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-1">
                      Actions Locked Until Intake Is Complete
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Complete the contact and location intake to unlock full recommendation tabs and the final actions for printing, PDF, and specialist submission.
                    </p>
                  </article>
                )}
              </aside>
            </div>
          </SectionWrap>
        </div>
      </div>

      {/* Print-only version single-page snapshot */}
      <div className="print-only recommendation-summary-print">
        {/* -- Header -- */}
        <div className="print-header">
          <img
            src="/brand/osso/osso-logo-horizontal.png"
            alt="OSSO Safety Eyewear"
            className="print-logo"
          />
          <div className="print-header-right">
            <div className="print-title">Program Recommendation</div>
            <div className="print-meta">
              {generatedOn}
              {companyName && ` | ${companyName}`}
            </div>
          </div>
        </div>

        {/* -- Hero Card -- */}
        <div className="print-hero">
          <div className="print-hero-left">
            <span className="print-hero-eyebrow">
              Recommended Configuration
            </span>
            <span className="print-hero-package">
              {selectedPackage && serviceTier
                ? `${selectedPackage} + ${serviceTier}`
                : displayValue(selectedPackage)}
            </span>
            {(programConfig.programProfile.exposureRisks ?? []).length > 0 && (
              <div className="print-pills print-hero-pills">
                {(programConfig.programProfile.exposureRisks ?? []).map(
                  (risk) => (
                    <span key={risk} className="print-pill">
                      {exposureRiskLabel(risk)}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
          <div className="print-hero-kpis">
            <div className="print-kpi">
              <span className="print-kpi-value">
                {displayValue(selectedPackage)} | {displayValue(serviceTier)}
              </span>
              <span className="print-kpi-label">Package &amp; Tier</span>
            </div>
            {coverageBand && (
              <div className="print-kpi">
                <span className="print-kpi-value">{coverageBand}</span>
                <span className="print-kpi-label">Team Size</span>
              </div>
            )}
            <div className="print-kpi">
              <span className="print-kpi-value">{displayValue(workType)}</span>
              <span className="print-kpi-label">Industry</span>
            </div>
          </div>
        </div>

        {/* -- Two Card Row: Coverage + Guidelines -- */}
        <div className="print-card-row">
          <div className="print-card">
            <div className="print-card-title">Coverage &amp; Service</div>
            <table className="print-table">
              <tbody>
                <tr>
                  <td className="print-td-label">EU Package</td>
                  <td className="print-td-value">
                    {displayValue(selectedPackage)}
                  </td>
                </tr>
                <tr>
                  <td className="print-td-label">Service Tier</td>
                  <td className="print-td-value">
                    {displayValue(serviceTier)}
                  </td>
                </tr>
                <tr>
                  <td className="print-td-label">Coverage Band</td>
                  <td className="print-td-value">
                    {coverageBand ? `${coverageBand} employees` : "-"}
                  </td>
                </tr>
                {exposureSummary && (
                  <tr>
                    <td className="print-td-label">Exposure</td>
                    <td className="print-td-value">{exposureSummary}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="print-card">
            <div className="print-card-title">Program Guidelines</div>
            <table className="print-table">
              <tbody>
                <tr>
                  <td className="print-td-label">Industry</td>
                  <td className="print-td-value">{displayValue(workType)}</td>
                </tr>
                <tr>
                  <td className="print-td-label">Location Model</td>
                  <td className="print-td-value">
                    {displayValue(locationModel)}
                  </td>
                </tr>
                <tr>
                  <td className="print-td-label">Delivery</td>
                  <td className="print-td-value">
                    {displayValue(deliveryModel)}
                  </td>
                </tr>
                <tr>
                  <td className="print-td-label">Approval</td>
                  <td className="print-td-value">
                    {displayValue(approvalModel)}
                  </td>
                </tr>
                {programPosture && (
                  <tr>
                    <td className="print-td-label">Budget</td>
                    <td className="print-td-value">{programPosture}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* -- Two Card Row: Coatings + Locations/Contact -- */}
        <div className="print-card-row">
          {(programConfig.coatingRecommendations ?? []).length > 0 && (
            <div className="print-card">
              <div className="print-card-title">Recommended Coatings</div>
              {(programConfig.coatingRecommendations ?? []).map(
                (coating: CoatingRecommendation) => (
                  <div key={coating.id} className="print-coating">
                    <div className="print-coating-name">{coating.label}</div>
                    <div className="print-coating-desc">
                      {coating.description || coating.reason}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="print-card">
            <div className="print-card-title">
              Locations{locations.length > 0 ? ` (${locations.length})` : ""}{" "}
              &amp; Contact
            </div>
            {locations.length === 0 ? (
              <div className="print-note">
                Site details collected on first specialist call.
              </div>
            ) : (
              locations.map((location, idx) => {
                const addressParts = [
                  location.streetAddress,
                  location.city,
                  location.state,
                  location.zipCode,
                ].filter(Boolean);
                const hasAddress = addressParts.length > 0;
                return (
                  <div key={`${location.label}_${idx}`} className="print-loc-row">
                    <span className="print-loc-num">#{idx + 1}</span>
                    <span className="print-loc-name">
                      {location.label || `Location ${idx + 1}`}
                      {hasAddress && ` — ${addressParts.join(", ")}`}
                      {location.oneWayMiles > 0
                        ? ` | ${location.oneWayMiles} mi`
                        : ""}
                    </span>
                  </div>
                );
              })
            )}
            {(companyName || contactName || email || phone) && (
              <div className="print-contact-block">
                <table className="print-table">
                  <tbody>
                    {companyName && (
                      <tr>
                        <td className="print-td-label">Company</td>
                        <td className="print-td-value">{companyName}</td>
                      </tr>
                    )}
                    {contactName && (
                      <tr>
                        <td className="print-td-label">Name</td>
                        <td className="print-td-value">{contactName}</td>
                      </tr>
                    )}
                    {email && (
                      <tr>
                        <td className="print-td-label">Email</td>
                        <td className="print-td-value">{email}</td>
                      </tr>
                    )}
                    {phone && (
                      <tr>
                        <td className="print-td-label">Phone</td>
                        <td className="print-td-value">{phone}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* -- Footer -- */}
        <div className="print-footer">
          <p className="print-footer-disclaimer">
            This document is a preliminary recommendation only and does not
            constitute a final program agreement. A Program Specialist
            will review this information with you and all details, including
            coverage, coatings, and service configuration, are subject to change.
          </p>
        </div>
      </div>
    </section>
  );
}
