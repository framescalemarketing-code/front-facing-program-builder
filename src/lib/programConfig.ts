import type { Draft, DraftPatch, EUPackage, ServiceTier } from "@/lib/programDraft";
import type { CoatingRecommendation } from "@/lib/recommendProgram";

export type ProgramConfigVersion = 1;

export type ProgramWorkType =
  | "manufacturing"
  | "construction"
  | "utilities"
  | "warehouse"
  | "healthcare"
  | "public_sector"
  | "laboratory"
  | "other";

export type ProgramLocationModel =
  | "single"
  | "multi_same_region"
  | "multi_across_regions";

export type ProgramExposureRisk =
  | "high_impact"
  | "dust_debris"
  | "chemical_splash"
  | "outdoor_glare"
  | "fog_humidity"
  | "indoor_outdoor_shift"
  | "screen_intensive"
  | "temperature_extremes";

export type ProgramBudgetPreference =
  | "super_strict"
  | "low_budget"
  | "good_budget"
  | "unlimited_budget";

export type CurrentSafetySetup =
  | "no_formal_program"
  | "reimbursement"
  | "covered_through_vision_insurance"
  | "vendor_optometry_partnership"
  | "voucher"
  | "employer_fully_covered"
  | "employer_base_with_upgrades"
  | "approval_required"
  | "manager_approval_required"
  | "centralized_safety_approval"
  | "onsite_events"
  | "regional_service_centers"
  | "mail_fulfillment"
  | "employee_self_order"
  | "hybrid_model"
  | "hybrid_delivery"
  | "prescription_safety_eyewear"
  | "non_prescription_safety_eyewear"
  | "otg_non_prescription_eyewear"
  | "hybrid_eyewear";

export type ProgramComplexityTier =
  | "structurally_sound"
  | "operationally_strong"
  | "system_scalable"
  | "enterprise_grade";

export type ProgramConfig = {
  programConfigVersion: ProgramConfigVersion;
  generatedAtIso: string;
  source: "manual" | "recommendation";

  company: {
    companyName: string;
    contactName: string;
    role?: string;
    email: string;
    phone: string;
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  programProfile: {
    workType?: ProgramWorkType;
    coverageSizeBand?: "1_50" | "51_100" | "101_200" | "201_plus";
    locationModel?: ProgramLocationModel;
    exposureRisks?: ProgramExposureRisk[];
    currentSafetySetup?: CurrentSafetySetup[];
    budgetPreference?: ProgramBudgetPreference;
  };

  recommendedStructure: {
    serviceTier?: ServiceTier | "";
    allowanceScope?: "companywide" | "department_based";
  };

  deliveryModel: {
    primary?: "onsite" | "regional_centers" | "mail" | "hybrid" | "unknown";
    notes?: string;
  };

  approvalModel: {
    model?: "none" | "manager" | "centralized_safety" | "unknown";
    notes?: string;
  };

  planningNotes?: string;
  upgradeOptions?: {
    euPackage?: "Covered";
    serviceTier?: "Partnered";
    rationale: string[];
  };

  postureTier: ProgramComplexityTier;
  readinessTier?: ProgramComplexityTier;
  coatingRecommendations?: CoatingRecommendation[];

  /** Per-location program recommendations (generated when locationModel is multi-site) */
  locationRecommendations?: Array<{
    locationLabel: string;
    euPackage: EUPackage | "";
    serviceTier: ServiceTier | "";
    note: string;
  }>;
};

export type ProgramConfigEnvelope = {
  active?: ProgramConfig;
  manualDraftSnapshot?: Draft;
};

function nowIso() {
  return new Date().toISOString();
}

export function deriveProgramConfigFromDraft(draft: Draft): ProgramConfig {
  const contact = draft.program.contact;
  const locationsCount = Array.isArray(draft.program.locations)
    ? draft.program.locations.length
    : 0;

  const derivedTier = deriveComplexityTier({
    employees:
      typeof draft.program.eligibleEmployees === "number"
        ? draft.program.eligibleEmployees
        : 0,
    locations: locationsCount,
    exposureCount: 0,
    deliverySignals: [],
    approvalSignals: [
      draft.builder.guidelines.approvalWorkflowEnabled ? "manager" : "none",
    ],
  });

  return {
    programConfigVersion: 1,
    generatedAtIso: nowIso(),
    source: "manual",
    company: {
      companyName: (contact.companyName ?? "").trim(),
      contactName: (contact.fullName ?? "").trim(),
      role: (contact.role ?? "").trim(),
      email: (contact.email ?? "").trim(),
      phone: (contact.phone ?? "").trim(),
    },
    programProfile: {},
    recommendedStructure: {
      serviceTier: draft.program.selectedTier ?? "",
      allowanceScope: draft.builder.guidelines.allowanceScope,
    },
    deliveryModel: {
      primary: "unknown",
    },
    approvalModel: {
      model: draft.builder.guidelines.approvalWorkflowEnabled
        ? "manager"
        : "none",
    },
    planningNotes: "",
    postureTier: derivedTier,
  };
}

export function buildDraftPatchFromProgramConfig(
  config: ProgramConfig,
): DraftPatch {
  const allowanceScope =
    config.recommendedStructure.allowanceScope ?? "companywide";
  const selectedTier = (config.recommendedStructure.serviceTier ?? "") as
    | ServiceTier
    | "";
  return {
    builder: {
      guidelines: {
        sideShieldType: "permanent",
        eligibilityFrequency: "annual",
        coverageType: "prescription_only",
        allowanceScope,
        approvalWorkflowEnabled:
          config.approvalModel.model === "manager" ||
          config.approvalModel.model === "centralized_safety",
        restrictions: {
          restrictSunglassOptions: false,
          restrictUvReactivePhotochromicLenses: false,
        },
        notes: "",
      },
    },
    program: {
      selectedTier,
      contact: {
        companyName: config.company.companyName,
        fullName: config.company.contactName,
        role: config.company.role ?? "",
        email: config.company.email,
        phone: config.company.phone,
      },
    },
  };
}

export function deriveComplexityTier(args: {
  employees: number;
  locations: number;
  exposureCount: number;
  deliverySignals: Array<"onsite" | "regional" | "mail" | "hybrid">;
  approvalSignals: Array<"none" | "manager" | "centralized">;
}): ProgramComplexityTier {
  const employees = Math.max(
    0,
    Number.isFinite(args.employees) ? args.employees : 0,
  );
  const locations = Math.max(
    0,
    Number.isFinite(args.locations) ? args.locations : 0,
  );
  const exposureCount = Math.max(
    0,
    Number.isFinite(args.exposureCount) ? args.exposureCount : 0,
  );

  let score = 0;

  if (employees >= 500) score += 3;
  else if (employees >= 250) score += 2;
  else if (employees >= 60) score += 1;

  if (locations >= 10) score += 3;
  else if (locations >= 3) score += 2;
  else if (locations >= 2) score += 1;

  if (exposureCount >= 5) score += 2;
  else if (exposureCount >= 3) score += 1;

  if (args.deliverySignals.includes("hybrid")) score += 2;
  else if (
    args.deliverySignals.includes("onsite") &&
    args.deliverySignals.includes("mail")
  )
    score += 2;
  else if (args.deliverySignals.length >= 2) score += 1;

  if (args.approvalSignals.includes("centralized")) score += 2;
  else if (args.approvalSignals.includes("manager")) score += 1;

  if (score >= 8) return "enterprise_grade";
  if (score >= 5) return "system_scalable";
  if (score >= 3) return "operationally_strong";
  return "structurally_sound";
}
