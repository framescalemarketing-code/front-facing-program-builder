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
const DIRECTION_STEP_INDEX = 4;
const LOCATIONS_STEP_INDEX = 1;
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
    other: "Other",
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
    super_strict: "Lean Budget",
    low_budget: "Lean Budget",
    good_budget: "Balanced Budget",
    unlimited_budget: "Growth Budget",
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
              This is our recommended fit based on your inputs and current
              operating model.
            </p>
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

  const hasCoveredUpgrade = programConfig.upgradeOptions?.euPackage === "Covered";
  const hasPartneredUpgrade =
    programConfig.upgradeOptions?.serviceTier === "Partnered";
  const exposureCount = programConfig.programProfile.exposureRisks?.length ?? 0;

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
                      <div className="px-6 py-6 border-t border-slate-100 bg-linear-to-br from-slate-50/80 via-white to-slate-50/50">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                          Snapshot Fit Overview
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          This snapshot shows our recommendation based on your inputs, including team profile, exposure conditions, and how your program runs today.
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-[#244093]/20 bg-linear-to-br from-white to-[#f3f7ff] px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Recommended Fit
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {selectedPackage ?? "Package pending"}
                              <span className="mx-1 text-slate-400">+</span>
                              {serviceTier ?? "Tier pending"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              EU package and service tier selected from your current program inputs.
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Workforce Footprint
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {coverageBand ? `${coverageBand} employees` : "Team size pending"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {locationModel ? `${locationModel}${locations.length > 0 ? ` (${locations.length})` : ""}` : "Location model pending"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Risk Posture
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {exposureCount > 0
                                ? `${exposureCount} hazards selected`
                                : "No hazards selected"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {exposureSummary ?? "No hazard signals were selected."}
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Operating Mode
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {(deliveryModel || approvalModel)
                                ? [deliveryModel, approvalModel].filter(Boolean).join(" + ")
                                : "Setup details pending"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {programPosture ? `Budget direction: ${programPosture}` : "Budget direction pending"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Profile details */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                          Key Signals
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {workType && (
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                              Industry: {workType}
                            </span>
                          )}
                          {locationModel && (
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                              Locations: {locationModel}
                              {locations.length > 0 ? ` (${locations.length})` : ""}
                            </span>
                          )}
                          {deliveryModel && (
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                              Delivery: {deliveryModel}
                            </span>
                          )}
                          {approvalModel && (
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                              Approval: {approvalModel}
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

                        {/* Travel flag */}
                        {locations.some((l) => l.oneWayMiles > 50) && (
                          <p className="text-xs font-medium text-slate-500">
                            Potential travel surcharge may apply to some locations
                          </p>
                        )}

                        {(hasCoveredUpgrade || hasPartneredUpgrade) && (
                          <div className="space-y-3 pt-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              You May Also Need This
                            </p>
                            {hasCoveredUpgrade && (
                              <div className="relative overflow-hidden rounded-xl border border-[#d6e2f7] bg-linear-to-br from-[#fdfefe] via-[#f9fbff] to-[#f2f6ff] p-4 shadow-sm shadow-[#244093]/8">
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#244093]/4 via-transparent to-transparent"
                                />
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-[#c8a45a] via-[#e2c98a] to-[#c8a45a]"
                                />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#355a9a] mb-1">
                                  Concierge Upgrade
                                </p>
                                <h5 className="text-sm font-bold text-slate-900 mb-1">
                                  Covered Package Signal
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  You can ask about a Covered package with a more customizable allowance, plus expanded lens and frame options.
                                </p>
                                <div className="mt-3 inline-flex rounded-full border border-[#d8e1f2] bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#355a9a]">
                                  Custom Allowance + Lens + Frame Options
                                </div>
                              </div>
                            )}

                            {hasPartneredUpgrade && (
                              <div className="relative overflow-hidden rounded-xl border border-[#d6e2f7] bg-linear-to-br from-[#fdfefe] via-[#f9fbff] to-[#f2f6ff] p-4 shadow-sm shadow-[#244093]/8">
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#244093]/4 via-transparent to-transparent"
                                />
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-[#c8a45a] via-[#e2c98a] to-[#c8a45a]"
                                />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#355a9a] mb-1">
                                  Concierge Upgrade
                                </p>
                                <h5 className="text-sm font-bold text-slate-900 mb-1">
                                  Partnership Service Signal
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  You can ask about a more customizable Partnership service tier setup.
                                </p>
                                <div className="mt-3 inline-flex rounded-full border border-[#d8e1f2] bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#355a9a]">
                                  Premium Service Tier Configuration
                                </div>
                              </div>
                            )}
                          </div>
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
                          Operational Profile and Fit
                        </p>
                        <div className="inline-flex rounded-full border border-[#244093]/20 bg-[#244093]/6 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-[#244093] mb-3">
                          {selectedPackage && serviceTier
                            ? `${selectedPackage} + ${serviceTier}`
                            : "Package and Tier Pending"}
                        </div>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          This section summarizes who your operation is today, what day-to-day execution likely looks like, and why this recommended fit matches your current stage.
                        </p>
                      </div>

                      {/* Day-to-day profile + fit rationale */}
                      <div className="px-6 py-5 border-t border-slate-100">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                              Day-to-Day Operating Profile
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {workType ?? "Your operation"} teams with {coverageBand ?? "your current"} employee coverage and {locationModel ?? "your location"} structure typically need steady service rhythm, clear routing, and reliable replacement support.
                            </p>
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                              Current execution signals: {deliveryModel ?? "Delivery pending"} + {approvalModel ?? "Approval pending"}.
                            </p>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                              Recommended Fit Right Now
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {selectedPackage ?? "Package"} + {serviceTier ?? "Tier"} fits where your program is today: enough structure to support current demand without overbuilding the model.
                            </p>
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                              Budget direction: {programPosture ?? "Not selected"}. Exposure context: {exposureSummary ?? "No hazards selected"}.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer note */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-linear-to-r from-[#244093]/3 to-[#2971b5]/2">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {packageTierFit.body}
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
                          Coverage Decision Logic
                        </p>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                          Here is how your EU package and service tier were selected.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
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

                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          How The Decision Was Made
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Team + Locations
                            </p>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {coverageBand ?? "Team size pending"} employees across {locationModel ?? "location model pending"} sets the base service load and coordination needs.
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Exposure Complexity
                            </p>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {exposureSummary ?? "No hazards selected"} informs how deep package coverage should go.
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Current Setup
                            </p>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {deliveryModel ?? "Delivery pending"} + {approvalModel ?? "Approval pending"} indicates the level of operational structure needed.
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                              Budget Direction
                            </p>
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                              {programPosture ?? "Budget pending"} helps confirm the right balance between coverage depth and service support.
                            </p>
                          </div>
                        </div>

                        {hasCoveredUpgrade && (
                          <div className="mt-4 relative overflow-hidden rounded-xl border border-[#d6e2f7] bg-linear-to-br from-[#fdfefe] via-[#f9fbff] to-[#f2f6ff] p-4 shadow-sm shadow-[#244093]/8">
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#244093]/4 via-transparent to-transparent"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-[#c8a45a] via-[#e2c98a] to-[#c8a45a]"
                            />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#355a9a] mb-1">
                              Concierge Upgrade
                            </p>
                            <h5 className="text-sm font-bold text-slate-900 mb-1">
                              Covered Package Signal
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Your selections indicate a Covered package conversation is worth having, especially if you want a more customizable allowance with expanded lens and frame options.
                            </p>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                              Ask your Program Specialist about how Covered can be tailored to your team's specific policy and product needs.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={primaryButtonClass}
                              >
                                Explore Covered
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
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {packageTierSummary ?? "This recommendation reflects your current program signals and operating context."}
                        </p>
                        {hasPartneredUpgrade && (
                          <div className="mt-4 relative overflow-hidden rounded-xl border border-[#d6e2f7] bg-linear-to-br from-[#fdfefe] via-[#f9fbff] to-[#f2f6ff] p-4 shadow-sm shadow-[#244093]/8">
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#244093]/4 via-transparent to-transparent"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-[#c8a45a] via-[#e2c98a] to-[#c8a45a]"
                            />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#355a9a] mb-1">
                              Concierge Upgrade
                            </p>
                            <h5 className="text-sm font-bold text-slate-900 mb-1">
                              Partnership Service Signal
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Your inputs suggest the Partnership service tier may be a strong fit if you want a more customizable service tier setup.
                            </p>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                              Ask your Program Specialist how a Partnership model can be configured for your rollout, governance, and support needs.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={navigateToCongratulations}
                                className={primaryButtonClass}
                              >
                                Explore Partnership
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
                            These coatings are tailored to your {workType ?? "team"} profile, {coverageBand ?? "current"} coverage scale, and selected exposure conditions.
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
                                  Tailored fit: {coating.reason}
                                </p>
                                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                  {coating.description} This supports the current {selectedPackage ?? "recommended"} package and {serviceTier ?? "service"} tier model.
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
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                          This section combines your current state with the operational and logistics support we can provide across ordering, approvals, fulfillment, and multi-site coordination.
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

                      <div className="px-6 py-5 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Operations and Logistics Support We Can Provide
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <p className="text-xs font-semibold text-slate-700">Program setup and onboarding</p>
                            <p className="mt-1 text-xs text-slate-500">Eligibility setup, launch support, and rollout guidance for teams and locations.</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <p className="text-xs font-semibold text-slate-700">Ordering and fulfillment channels</p>
                            <p className="mt-1 text-xs text-slate-500">Onsite events, online ordering, and hybrid delivery models matched to your workflow.</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <p className="text-xs font-semibold text-slate-700">Approval and policy routing</p>
                            <p className="mt-1 text-xs text-slate-500">Single or multi-step approval structures with clearer routing and accountability.</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <p className="text-xs font-semibold text-slate-700">Ongoing operations support</p>
                            <p className="mt-1 text-xs text-slate-500">Replacement workflows, service continuity, and multi-site coordination support.</p>
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
            decoding="async"
            width={320}
            height={64}
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
          <div className="print-card">
            <div className="print-card-title">Recommended Coatings</div>
            {(programConfig.coatingRecommendations ?? []).length > 0 ? (
              (programConfig.coatingRecommendations ?? []).map(
                (coating: CoatingRecommendation) => (
                  <div key={coating.id} className="print-coating">
                    <div className="print-coating-name">{coating.label}</div>
                    <div className="print-coating-desc">
                      {coating.description || coating.reason}
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="print-empty-state">
                No coating recommendations were generated from the selected
                profile.
              </div>
            )}
          </div>

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
