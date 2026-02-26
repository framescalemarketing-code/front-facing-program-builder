"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { defaultDraft } from "@/lib/programDraft";
import {
  deriveProgramConfigFromDraft,
  type ProgramBudgetPreference,
  type ProgramComplexityTier,
  type ProgramConfig,
  type ProgramExposureRisk,
} from "@/lib/programConfig";

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
    super_strict: "Foundational Standardization",
    low_budget: "Steady Operations",
    good_budget: "Balanced Growth",
    unlimited_budget: "Maximum Coverage",
  };

  if (!value) return null;
  return map[value] ?? null;
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
      label: "Foundational",
      badgeClass: "border-sky-300 bg-sky-100 text-sky-900",
      explanation:
        "Your profile is best served by a focused baseline with clear standards and straightforward controls. This keeps rollout simple while building a strong compliance foundation. It also gives you room to scale without operational resets.",
    },
    structured: {
      label: "Structured",
      badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-900",
      explanation:
        "Your program needs stronger workflow structure to support consistent execution. This tier balances employee adoption with reliable governance and predictable support channels. It keeps audit evidence cleaner as you grow.",
    },
    multi_site_controlled: {
      label: "Multi Site Controlled",
      badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
      explanation:
        "Your complexity indicates a multi-site program that benefits from tighter oversight and documented routing rules. This tier supports operational uptime across locations while controlling exceptions. It improves readiness for cross-site audits and reporting.",
    },
    enterprise_scale: {
      label: "Enterprise Scale",
      badgeClass: "border-violet-300 bg-violet-100 text-violet-900",
      explanation:
        "Your workforce profile points to enterprise-level operational demands. This tier emphasizes scalable controls, resilient service pathways, and centralized governance for consistency. It is designed to protect adoption, uptime, and audit posture at scale.",
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
  const email = nonEmpty(programConfig.company.email);
  const phone = nonEmpty(programConfig.company.phone);
  const workType = workTypeLabel(programConfig.programProfile.workType);
  const coverageBand = coverageBandLabel(programConfig.programProfile.coverageSizeBand);
  const locationModel = locationModelLabel(programConfig.programProfile.locationModel);
  const budgetDirection = budgetPreferenceLabel(programConfig.programProfile.budgetPreference);
  const deliveryModel = deliveryModelLabel(programConfig.deliveryModel.primary);
  const approvalModel = approvalModelLabel(programConfig.approvalModel.model);
  const exposureSummary = summarizeExposureRisks(programConfig.programProfile.exposureRisks);
  const selectedPackage = nonEmpty(program.selectedEU);
  const serviceTier = nonEmpty(program.selectedTier);

  const revealSummary = generatedRecommendationSummary({
    workType,
    coverageBand,
    exposureSummary,
    packageName: selectedPackage,
    serviceTier,
  });

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
            <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={secondaryButtonClass}>
              Back to Recommendation
            </button>
            <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={primaryButtonClass}>
              Start Over
            </button>
          </div>

          <div className="mt-8 rounded-md border border-border bg-card p-5">
            <div className="text-sm font-semibold text-foreground">Recommendation Snapshot</div>
            <p className="mt-2 text-sm text-muted-foreground">{revealSummary}</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground">Readiness Tier</div>
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
                <p className="mt-2 text-sm text-muted-foreground">
                  This recommendation is a starting point. Your OSSO program specialist will review it with you and adjust based on your specific site conditions, budget, and timeline.
                </p>
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
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Operational Profile</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <SummaryRow label="Work Type" value={workType} />
                  <SummaryRow label="Coverage Band" value={coverageBand} />
                  <SummaryRow label="Location Model" value={locationModel} />
                  <SummaryRow label="Program Direction" value={budgetDirection} />
                  <SummaryRow label="Delivery Model" value={deliveryModel} />
                  <SummaryRow label="Approval Model" value={approvalModel} />
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
