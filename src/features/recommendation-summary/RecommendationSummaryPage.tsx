"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { defaultDraft, type EUPackage, type ServiceTier } from "@/lib/programDraft";
import {
  deriveProgramConfigFromDraft,
  type ProgramBudgetPreference,
  type ProgramComplexityTier,
  type ProgramConfig,
  type ProgramExposureRisk,
  type ProgramLocationModel,
} from "@/lib/programConfig";

const RECOMMENDATION_START_STEP_KEY = "osso_recommendation_start_step";
const DIRECTION_STEP_INDEX = 6;
type CoverageSizeBand = NonNullable<ProgramConfig["programProfile"]["coverageSizeBand"]>;

function nonEmpty(value: string | undefined | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function workTypeLabel(value: string | undefined) {
  const map: Record<string, string> = {
    manufacturing: "Manufacturing safety",
    construction: "Construction safety",
    utilities: "Utilities safety",
    warehouse: "Warehouse safety",
    healthcare: "Healthcare safety",
    public_sector: "Public sector safety",
    laboratory: "Laboratory safety",
    other: "Specialized safety environment",
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

function packageTierExplainer(euPackage: EUPackage | null, serviceTier: ServiceTier | null) {
  if (!euPackage || !serviceTier) return null;
  const map: Record<string, string> = {
    "Compliance|Essential":
      "Your program starts with the right foundation - a clear standard your team can enforce, eligibility your employees can follow, and a service structure sized for where you are today.",
    "Compliance|Access":
      "A structured compliance baseline with enough service cadence to keep the program running as headcount grows or shifts change.",
    "Comfort|Access":
      "Better fit selection and stronger adoption support built into the standard. Employees get what they need to actually wear it - which is how the program earns its value.",
    "Comfort|Premier":
      "Full adoption-focused package with the service depth to run it consistently. Fits environments where comfort and wear compliance are as important as technical protection standards.",
    "Complete|Access":
      "Broader coverage options and prescription flexibility for mixed-role environments, paired with service cadence that keeps access consistent without heavy coordination overhead.",
    "Complete|Premier":
      "The most common recommendation for growing programs that need performance features, mixed prescriptions, and a service structure that does not require constant manual management.",
    "Complete|Enterprise":
      "Enterprise service depth applied to a Complete package - for large or complex programs that need full operational support alongside broader coverage options.",
    "Covered|Premier":
      "Maximum configurability for organizations with multiple job functions, locations, or operating conditions - paired with Premier service to keep the complexity manageable.",
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
  exposureCount = 0
): string {
  const hasNoFormalProgram = (setup ?? []).includes("no_formal_program");
  const isMultiLocation = location === "multi_same_region" || location === "multi_across_regions";

  if (band === "500_plus" && location === "multi_across_regions") {
    return "At this size and spread a self-serve recommendation is a starting point, not a complete program design. You will be connected with a senior program specialist who will work through your site structure, compliance requirements, and rollout timeline before anything is confirmed.";
  }

  if ((band === "251_500" || band === "500_plus") && isMultiLocation && (posture === "good_budget" || posture === "unlimited_budget")) {
    return "Programs at this scale benefit from a dedicated specialist review before configuration is finalized. You will be connected with someone who knows multi-site program execution and can identify edge cases before they become problems.";
  }

  if (band === "1_30" && hasNoFormalProgram && posture === "super_strict") {
    return "This recommendation gives you a starting point - not a finished program. A specialist will review your setup and confirm the structure fits before anything is built. For programs at this stage that conversation usually takes 20 minutes.";
  }

  if ((band === "31_60" || band === "61_100" || band === "101_250") && location === "single") {
    return "This recommendation is a strong starting point. Your OSSO program specialist will review it with you and adjust based on your specific site conditions, existing vendor relationships, and timeline. Most programs at this size are operational within 60 days of kickoff.";
  }

  if (band === "1_30" && location === "single" && exposureCount === 0) {
    return "For programs under 30 employees our specialist will confirm program structure fits before proceeding.";
  }

  return "This recommendation is your starting point. Your OSSO program specialist will review your profile with you and confirm the right structure before launch.";
}

function recommendationSnapshotContext(
  band: CoverageSizeBand | undefined,
  location: ProgramLocationModel | undefined,
  posture: ProgramBudgetPreference | undefined,
  setup: ProgramConfig["programProfile"]["currentSafetySetup"] = []
) {
  const hasNoFormalProgram = (setup ?? []).includes("no_formal_program");
  if (hasNoFormalProgram && posture === "super_strict") {
    return "Starting from scratch is actually the cleanest way to build this right. Your specialist will design it around your operation, not someone else's template.";
  }

  if (band === "500_plus" && location === "multi_across_regions") {
    return "At this scale we assign a dedicated program specialist before anything is configured. This is a partnership engagement, not a self-serve program.";
  }

  return null;
}

function growthPath(
  euPackage: EUPackage | null,
  serviceTier: ServiceTier | null,
  band: CoverageSizeBand | undefined,
  location: ProgramLocationModel | undefined
) {
  if (!euPackage || !serviceTier) {
    return "As your operation changes, your specialist will map the next package and service step before complexity creates friction.";
  }

  const packageTier = `${euPackage}|${serviceTier}`;
  if (packageTier === "Compliance|Essential") {
    return "When your program grows past 30 employees or your exposures expand, Comfort with Access gives you better adoption support while keeping the program manageable. Most programs make this move within 12-18 months of launch.";
  }
  if (packageTier === "Compliance|Access") {
    return "Onsite events or a second location typically unlocks the case for Complete + Premier - more product flexibility and a service cadence that keeps both sites running without added coordinator overhead.";
  }
  if (packageTier === "Comfort|Access") {
    return "As your team expands, Complete gives you broader prescription flexibility and design options. At 61-100 employees Premier service provides the scheduling depth to keep access consistent across shifts.";
  }
  if (packageTier === "Comfort|Premier") {
    return "As locations and approval complexity increase, programs at this level often move into Complete to gain broader flexibility without adding policy friction.";
  }
  if (packageTier === "Complete|Access") {
    return "Multiple locations or 100+ employees usually means Premier service is the more stable choice. The added reporting cadence and coordinator support reduces the manual load your safety team carries.";
  }
  if (packageTier === "Complete|Premier") {
    return "When programs grow across regions or exceed 250 employees, Covered with Enterprise service gives you the configurability to handle different site conditions without creating a patchwork of policy exceptions.";
  }
  if (packageTier === "Complete|Enterprise") {
    return "With enterprise delivery in place, the next growth step is governance depth - cross-site standards, reporting cadence, and specialist-led optimization as new sites are added.";
  }
  if (packageTier === "Covered|Premier") {
    return "At full scale, Enterprise service tier transforms this from a managed program into a partnership - dedicated support, proactive reporting, and a specialist who knows your program and anticipates what is coming.";
  }
  if (packageTier === "Covered|Enterprise") {
    return "This is our full partnership model. When your needs evolve - new sites, acquisitions, changing compliance requirements - your dedicated specialist adjusts the program alongside you.";
  }

  if (band === "500_plus" || location === "multi_across_regions") {
    return "As complexity grows, the next step is deeper governance and specialist-led execution to keep standards consistent across locations.";
  }
  return "As your workforce grows, your specialist can step package depth and service cadence to match new complexity without rework.";
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
  if (risks.length === 2) return `${exposureRiskLabel(risks[0])} and ${exposureRiskLabel(risks[1])}`;
  const firstTwo = risks.slice(0, 2).map((risk) => exposureRiskLabel(risk)).join(", ");
  return `${firstTwo}, and related risk controls`;
}

function readinessCard(tier: ProgramComplexityTier) {
  const map: Record<ProgramComplexityTier, { label: string; badgeClass: string; explanation: string }> = {
    foundational: {
      label: "Building Strong",
      badgeClass: "border-sky-300 bg-sky-100 text-sky-900",
      explanation:
        "Your program is in the right position to build something that actually sticks. A focused structure now means fewer exceptions, cleaner compliance records, and a baseline your team can operate without constant correction. When your workforce grows or your locations change, this foundation holds without needing a full reset.",
    },
    structured: {
      label: "Running Clean",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
      explanation:
        "Your program has the right ingredients to run consistently without constant oversight. The structure here balances employee experience with governance that holds up, so people get what they need, audits stay clean, and your team is not fielding exceptions every week. This is a program that earns trust through reliability.",
    },
    multi_site_controlled: {
      label: "Scaled with Control",
      badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
      explanation:
        "Running safety across multiple locations is where most programs quietly start to drift. Yours does not have to. This profile points to a program structure that keeps standards consistent site to site, reduces the noise of local exceptions, and makes your team look coordinated from the inside out. When audits come or leadership asks, you have the documentation to back it up.",
    },
    enterprise_scale: {
      label: "Enterprise Ready",
      badgeClass: "border-violet-300 bg-violet-100 text-violet-900",
      explanation:
        "At this scale, the difference between a program that works and one that creates friction is the depth of support behind it. Your profile calls for a partnership model, not just a vendor. That means a specialist who knows your program, reporting that gives leadership visibility, and a structure designed to stay consistent as your workforce shifts, your sites expand, and your compliance obligations evolve.",
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
  const coverageBand = args.coverageBand ? `${args.coverageBand} employees` : "your current team size";
  const exposureSummary = args.exposureSummary ?? "your current exposure profile";
  const packageName = args.packageName ?? "the recommended package";
  const serviceTier = args.serviceTier ?? "the recommended service tier";

  return `Based on your ${workType.toLowerCase()}, ${coverageBand}, and ${exposureSummary}, we recommend ${packageName} with ${serviceTier}. This combination is designed to keep employee adoption high while preserving day-to-day operational uptime and long-term audit readiness.`;
}

function SummaryRow(props: { label: string; value: string | null }) {
  if (!props.value) return null;
  return (
    <div>
      {props.label}: <span className="font-medium text-foreground">{props.value}</span>
    </div>
  );
}

function ExposurePills(props: { risks: ProgramExposureRisk[] | undefined }) {
  if (!props.risks || props.risks.length === 0) return null;
  return (
    <div className="pt-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Exposure Risks</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {props.risks.map((risk) => (
          <span key={risk} className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {exposureRiskLabel(risk)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RecommendationSummaryPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft } = useProgramDraft();
  const program = draft?.program ?? defaultDraft.program;
  const activeConfig = draft?.programConfig?.active;
  const programConfig: ProgramConfig =
    activeConfig && typeof activeConfig === "object" && "programConfigVersion" in (activeConfig as Record<string, unknown>)
      ? (activeConfig as ProgramConfig)
      : deriveProgramConfigFromDraft(draft ?? defaultDraft);

  const readiness = readinessCard(programConfig.readinessTier);
  const companyName = nonEmpty(programConfig.company.companyName) ?? nonEmpty(draft?.program.contact.companyName);
  const contactName = nonEmpty(programConfig.company.contactName);
  const contactRole = nonEmpty(programConfig.company.role);
  const email = nonEmpty(programConfig.company.email);
  const phone = nonEmpty(programConfig.company.phone);
  const workType = workTypeLabel(programConfig.programProfile.workType);
  const coverageBand = coverageBandLabel(programConfig.programProfile.coverageSizeBand);
  const locationModel = locationModelLabel(programConfig.programProfile.locationModel);
  const programPosture = budgetPreferenceLabel(programConfig.programProfile.budgetPreference);
  const deliveryModel = deliveryModelLabel(programConfig.deliveryModel.primary);
  const approvalModel = approvalModelLabel(programConfig.approvalModel.model);
  const exposureSummary = summarizeExposureRisks(programConfig.programProfile.exposureRisks);
  const selectedPackage = nonEmpty(program.selectedEU) as EUPackage | null;
  const serviceTier = nonEmpty(program.selectedTier) as ServiceTier | null;
  const packageTierSummary = packageTierExplainer(selectedPackage, serviceTier);
  const trustNote = trustNoteVariant(
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel,
    programConfig.programProfile.budgetPreference,
    programConfig.programProfile.currentSafetySetup,
    programConfig.programProfile.exposureRisks?.length ?? 0
  );
  const snapshotContext = recommendationSnapshotContext(
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel,
    programConfig.programProfile.budgetPreference,
    programConfig.programProfile.currentSafetySetup
  );
  const growthPathMessage = growthPath(
    selectedPackage,
    serviceTier,
    programConfig.programProfile.coverageSizeBand,
    programConfig.programProfile.locationModel
  );

  const revealSummary = generatedRecommendationSummary({
    workType,
    coverageBand,
    exposureSummary,
    packageName: selectedPackage,
    serviceTier,
  });

  function openRecommendationAtDirection() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(RECOMMENDATION_START_STEP_KEY, String(DIRECTION_STEP_INDEX));
    }
    onNavigate("recommendation", "internal");
  }

  return (
    <section aria-labelledby="recommendation-preview-title">
      <PageHero
        id="recommendation-preview-title"
        title="Program Recommendation Summary"
        subtitle="Your discovery inputs now translate into a deployment-ready recommendation."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={openRecommendationAtDirection} className={secondaryButtonClass}>
              Back to Recommendation
            </button>
            <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={primaryButtonClass}>
              Start Over
            </button>
          </div>

          <div className="mt-8 rounded-md border border-border bg-card p-5">
            <div className="text-sm font-semibold text-foreground">Recommendation Snapshot</div>
            <p className="mt-2 text-sm text-muted-foreground">{revealSummary}</p>
            {snapshotContext ? <p className="mt-3 text-sm font-medium text-foreground">{snapshotContext}</p> : null}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground">Your Program Profile</div>
              <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-4">
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${readiness.badgeClass}`}>
                  {readiness.label}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{readiness.explanation}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Next Step</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Move into the full preview to review configuration details and implementation direction.
                </p>
                <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={`${primaryButtonClass} mt-4 w-full`}>
                  Review Your Full Program Preview {"->"}
                </button>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-semibold text-foreground">Trust Note</div>
                <p className="mt-2 text-sm text-muted-foreground">{trustNote}</p>
              </div>

              <div className="rounded-md border border-emerald-200 border-l-4 border-emerald-400 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-950">Where This Program Can Go</div>
                <p className="mt-2 text-sm text-emerald-900">{growthPathMessage}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Your Profile</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <SummaryRow label="Company" value={companyName} />
                  <SummaryRow label="Safety Contact" value={contactName} />
                  <SummaryRow label="Role" value={contactRole} />
                  <SummaryRow label="Email" value={email} />
                  <SummaryRow label="Phone" value={phone} />
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Program Selection</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <SummaryRow label="EU Package" value={selectedPackage} />
                  <SummaryRow label="Service Tier" value={serviceTier} />
                  <SummaryRow
                    label="Allowance Scope"
                    value={
                      programConfig.recommendedStructure.allowanceScope === "department_based"
                        ? "Department Based Allowances"
                        : "Single Allowance For All Employees"
                    }
                  />
                </div>
                {packageTierSummary ? (
                  <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
                    {packageTierSummary}
                  </div>
                ) : null}
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Operational Profile</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <SummaryRow label="Work Type" value={workType} />
                  <SummaryRow label="Coverage Band" value={coverageBand} />
                  <SummaryRow label="Location Model" value={locationModel} />
                  <SummaryRow label="Program Posture" value={programPosture} />
                  <SummaryRow label="Delivery Model" value={deliveryModel} />
                  <SummaryRow label="Approval Model" value={approvalModel} />
                  <ExposurePills risks={programConfig.programProfile.exposureRisks} />
                </div>
              </div>
            </div>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Location Summary</div>
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {(program.locations ?? []).map((location, idx) => (
                    <div key={`${location.label}_${idx}`} className="rounded-md border border-border bg-background p-3">
                      <div>
                        Location <span className="font-medium text-foreground">{idx + 1}</span>
                      </div>
                      {location.oneWayMiles > 50 ? (
                        <div className="mt-1 font-medium text-foreground">Potential travel surcharge</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
