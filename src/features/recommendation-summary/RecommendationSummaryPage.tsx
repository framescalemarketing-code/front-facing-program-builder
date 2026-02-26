"use client";

import { useEffect, useRef, useState } from "react";
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
import "./recommendationSummaryPrint.css";

const RECOMMENDATION_START_STEP_KEY = "osso_recommendation_start_step";
const DIRECTION_STEP_INDEX = 6;
const LOCATIONS_STEP_INDEX = 3;
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

function SummaryRow(props: {
  label: string;
  value: string | null;
  showPlaceholderWhenEmpty?: boolean;
  placeholderText?: string;
}) {
  const hasValue = Boolean(props.value);
  if (!hasValue && !props.showPlaceholderWhenEmpty) return null;
  return (
    <div>
      {props.label}:{" "}
      <span className={hasValue ? "font-medium text-foreground" : "font-medium text-muted-foreground"}>
        {hasValue ? props.value : props.placeholderText ?? "Not provided"}
      </span>
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
  const allowanceScope =
    programConfig.recommendedStructure.allowanceScope === "department_based"
      ? "Department Based Allowances"
      : "Single Allowance For All Employees";
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
      window.sessionStorage.setItem(RECOMMENDATION_START_STEP_KEY, String(DIRECTION_STEP_INDEX));
    }
    onNavigate("recommendation", "internal");
  }

  function openRecommendationAtLocations() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(RECOMMENDATION_START_STEP_KEY, String(LOCATIONS_STEP_INDEX));
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

          <div className="mt-6 grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <article className="rounded-md border border-border bg-card p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-foreground">Recommendation summary</h2>

                <section className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground">Program snapshot</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{revealSummary}</p>
                  {snapshotContext ? <p className="mt-3 text-sm font-medium text-foreground">{snapshotContext}</p> : null}
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Program posture and rationale</h3>
                  <div className="mt-2 rounded-lg bg-secondary/40 p-4">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${readiness.badgeClass}`}>
                      {readiness.label}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{readiness.explanation}</p>
                  </div>
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Coverage and allowance</h3>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <SummaryRow label="EU Package" value={selectedPackage} showPlaceholderWhenEmpty />
                    <SummaryRow label="Service Tier" value={serviceTier} showPlaceholderWhenEmpty />
                    <SummaryRow label="Coverage Band" value={coverageBand} showPlaceholderWhenEmpty />
                    <SummaryRow
                      label="Allowance Scope"
                      value={allowanceScope}
                      showPlaceholderWhenEmpty
                    />
                  </div>
                  {packageTierSummary ? (
                    <div className="mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
                      {packageTierSummary}
                    </div>
                  ) : null}
                  <ExposurePills risks={programConfig.programProfile.exposureRisks} />
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Approvals and logistics</h3>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <SummaryRow label="Work Type" value={workType} showPlaceholderWhenEmpty />
                    <SummaryRow label="Location Model" value={locationModel} showPlaceholderWhenEmpty />
                    <SummaryRow label="Program Posture" value={programPosture} showPlaceholderWhenEmpty />
                    <SummaryRow label="Delivery Model" value={deliveryModel} showPlaceholderWhenEmpty />
                    <SummaryRow label="Approval Model" value={approvalModel} showPlaceholderWhenEmpty />
                  </div>
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Locations</h3>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {locations.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border bg-background p-3">
                        <p className="text-sm text-muted-foreground">
                          No locations provided. Add at least one location in the recommendation step.
                        </p>
                        <button type="button" onClick={openRecommendationAtLocations} className={`${secondaryButtonClass} mt-3`}>
                          Add Locations
                        </button>
                      </div>
                    ) : (
                      locations.map((location, idx) => (
                        <div key={`${location.label}_${idx}`} className="rounded-md border border-border bg-background p-3">
                          <div>
                            Location <span className="font-medium text-foreground">{idx + 1}</span>
                          </div>
                          {location.oneWayMiles > 50 ? (
                            <div className="mt-1 font-medium text-foreground">Potential travel surcharge</div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Contact and profile</h3>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <SummaryRow label="Company" value={companyName} showPlaceholderWhenEmpty />
                    <SummaryRow label="Safety Contact" value={contactName} showPlaceholderWhenEmpty />
                    <SummaryRow label="Role" value={contactRole} showPlaceholderWhenEmpty />
                    <SummaryRow label="Email" value={email} showPlaceholderWhenEmpty />
                    <SummaryRow label="Phone" value={phone} showPlaceholderWhenEmpty />
                  </div>
                </section>
              </article>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <article className="rounded-md border border-border bg-card p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-foreground">Next actions</h2>

                <section className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground">Submit and save</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Submit this recommendation or print a copy for your records.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button type="button" onClick={navigateToCongratulations} className={`${primaryButtonClass} w-full`}>
                      Submit to an OSSO Program Specialist
                    </button>
                    <button type="button" onClick={handlePrintOrSavePdf} className={`${secondaryButtonClass} w-full`}>
                      Print or Save as PDF
                    </button>
                  </div>
                  {showPrintContinue ? (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm text-emerald-900">Print dialog closed. Continue when you are ready.</p>
                      <button type="button" onClick={navigateToCongratulations} className={`${primaryButtonClass} mt-2 w-full`}>
                        Continue
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Prepare for scale</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Before launch, lock in these operating decisions so implementation stays consistent.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Eligibility and frequency</li>
                    <li>Allowance model and coverage scope</li>
                    <li>Approval path for exceptions</li>
                    <li>Delivery model and service level</li>
                    <li>Primary contacts</li>
                    <li>Locations and ownership</li>
                  </ul>
                </section>

                <section className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Trust note</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{trustNote}</p>
                </section>
              </article>
            </aside>
          </div>
          </SectionWrap>
        </div>
      </div>

      <div className="print-only recommendation-summary-print">
        <header className="print-header">
          <img src="/brand/osso/osso-logo-horizontal.png" alt="OSSO logo" className="print-logo" />
          <div className="print-header-copy">
            <h1>Program Recommendation Summary</h1>
            <p>Generated on {generatedOn}</p>
            <p>Company: {displayValue(companyName)}</p>
          </div>
        </header>

        <section className="print-section">
          <h2>Program snapshot</h2>
          <p>{revealSummary}</p>
          {snapshotContext ? <p className="print-note">{snapshotContext}</p> : null}
        </section>

        <section className="print-section">
          <h2>Program posture and rationale</h2>
          <p>
            <strong>{readiness.label}.</strong> {readiness.explanation}
          </p>
          <p className="print-note">{trustNote}</p>
        </section>

        <section className="print-section">
          <h2>Coverage and allowance</h2>
          <table>
            <tbody>
              <PrintDataRow label="EU Package" value={selectedPackage} />
              <PrintDataRow label="Service Tier" value={serviceTier} />
              <PrintDataRow label="Coverage Band" value={coverageBand} />
              <PrintDataRow label="Allowance Scope" value={allowanceScope} />
              <PrintDataRow label="Exposure Profile" value={exposureSummary} />
            </tbody>
          </table>
          {packageTierSummary ? <p className="print-note">{packageTierSummary}</p> : null}
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
                    <td>{location.oneWayMiles > 50 ? "Potential travel surcharge" : "No travel surcharge flagged"}</td>
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
