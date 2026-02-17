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
  type ProgramConfig,
} from "@/lib/programConfig";

function safeText(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : "Not Provided";
}

function workTypeLabel(value: string | undefined) {
  const map: Record<string, string> = {
    manufacturing: "Manufacturing Safety",
    construction: "Construction Safety",
    utilities: "Utilities Safety",
    warehouse: "Warehouse Safety",
    healthcare: "Healthcare Safety",
    public_sector: "Public Sector Safety",
    laboratory: "Laboratory Safety",
    other: "Other Safety Environment",
  };
  return map[value ?? ""] ?? "Not Provided";
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
  return map[value ?? ""] ?? "Not Provided";
}

function locationModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    single: "Single Location",
    multi_same_region: "Multiple Locations Same Region",
    multi_across_regions: "Multiple Locations Across Regions",
  };
  return map[value ?? ""] ?? "Not Provided";
}

function budgetPreferenceLabel(value: ProgramBudgetPreference | undefined) {
  const map: Record<ProgramBudgetPreference, string> = {
    super_strict: "Foundational Standardization",
    low_budget: "Steady Operations",
    good_budget: "Balanced Growth",
    unlimited_budget: "Maximum Coverage",
  };

  if (!value) return "Not Provided";
  return map[value] ?? "Not Provided";
}

function readinessLabel(value: string | undefined) {
  const map: Record<string, string> = {
    foundational: "Foundational",
    structured: "Structured",
    multi_site_controlled: "Multi Site Controlled",
    enterprise_scale: "Enterprise Scale",
  };
  return map[value ?? ""] ?? "Foundational";
}

function deliveryModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    onsite: "Onsite",
    regional_centers: "Regional Service Centers",
    mail: "Online Ordering",
    hybrid: "Hybrid",
    unknown: "Not Provided",
  };
  return map[value ?? ""] ?? "Not Provided";
}

function approvalModelLabel(value: string | undefined) {
  const map: Record<string, string> = {
    none: "No Approval Step",
    manager: "Approval Required",
    centralized_safety: "Centralized Safety Approval",
    unknown: "Not Provided",
  };
  return map[value ?? ""] ?? "Not Provided";
}

export function RecommendationSummaryPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft } = useProgramDraft();
  const program = draft?.program ?? defaultDraft.program;
  const activeConfig = draft?.programConfig?.active;
  const programConfig: ProgramConfig =
    activeConfig && typeof activeConfig === "object" && "programConfigVersion" in (activeConfig as Record<string, unknown>)
      ? (activeConfig as ProgramConfig)
      : deriveProgramConfigFromDraft(draft ?? defaultDraft);

  return (
    <section aria-labelledby="recommendation-preview-title">
      <PageHero
        id="recommendation-preview-title"
        title="Program Recommendation Summary"
        subtitle="Review your front-facing recommendation and location summary."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={secondaryButtonClass}>
              Back to Recommendation
            </button>
            <button
              type="button"
              onClick={() => onNavigate("program", "recommendation_complete")}
              className={primaryButtonClass}
            >
              Open Program Details
            </button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Company Snapshot</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <div>Company: <span className="font-medium text-foreground">{safeText(programConfig.company.companyName)}</span></div>
                  <div>Safety Contact: <span className="font-medium text-foreground">{safeText(programConfig.company.contactName)}</span></div>
                  <div>Email: <span className="font-medium text-foreground">{safeText(programConfig.company.email)}</span></div>
                  <div>Phone: <span className="font-medium text-foreground">{safeText(programConfig.company.phone)}</span></div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Program Selection</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <div>
                    EU Package: <span className="font-medium text-foreground">{program.selectedEU || "Not Selected"}</span>
                  </div>
                  <div>
                    Service Tier: <span className="font-medium text-foreground">{program.selectedTier || "Not Selected"}</span>
                  </div>
                  <div>
                    Allowance Scope:{" "}
                    <span className="font-medium text-foreground">
                      {programConfig.recommendedStructure.allowanceScope === "department_based"
                        ? "Department Based Allowances"
                        : "Single Allowance For All Employees"}
                    </span>
                  </div>
                </div>
              </div>

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

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Operational Profile</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <div>Work Type: <span className="font-medium text-foreground">{workTypeLabel(programConfig.programProfile.workType)}</span></div>
                  <div>Coverage Band: <span className="font-medium text-foreground">{coverageBandLabel(programConfig.programProfile.coverageSizeBand)}</span></div>
                  <div>Location Model: <span className="font-medium text-foreground">{locationModelLabel(programConfig.programProfile.locationModel)}</span></div>
                  <div>Program Direction: <span className="font-medium text-foreground">{budgetPreferenceLabel(programConfig.programProfile.budgetPreference)}</span></div>
                  <div>Delivery Model: <span className="font-medium text-foreground">{deliveryModelLabel(programConfig.deliveryModel.primary)}</span></div>
                  <div>Approval Model: <span className="font-medium text-foreground">{approvalModelLabel(programConfig.approvalModel.model)}</span></div>
                </div>
              </div>
            </div>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Readiness Tier</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {readinessLabel(programConfig.readinessTier)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  This recommendation is a planning baseline for program design.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Next Step</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open the full program preview to review all selected inputs, location details, and program structure.
                </p>
              </div>
            </aside>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
