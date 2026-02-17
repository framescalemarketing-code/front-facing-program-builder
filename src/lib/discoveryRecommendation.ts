import { makeDepartmentConfigRow, makeDefaultLocations } from "@/lib/programDraft";
import type {
  AllowanceScope,
  CoverageType,
  DraftPatch,
  EUPackage,
  EUPackageAddOnKey,
  EligibilityFrequency,
  ServiceTier,
  SideShieldType,
} from "@/lib/programDraft";

export type DiscoveryIndustry =
  | "manufacturing"
  | "construction"
  | "utilities"
  | "logistics"
  | "healthcare"
  | "public_sector"
  | "laboratory"
  | "other";

export type DiscoveryHazard =
  | "impact"
  | "dust_debris"
  | "chemical_splash"
  | "outdoor_glare"
  | "fog_humidity"
  | "indoor_outdoor_shift"
  | "screen_intensive";

export type DiscoveryPrescriptionMix =
  | "mostly_prescription"
  | "mixed_prescription_and_non_prescription"
  | "bulk_over_the_glasses"
  | "non_prescription_safety_eyewear"
  | "unknown";

export type DiscoveryCurrentProgramModel = "voucher" | "insurance" | "third_party_vendor" | "none";
export type DiscoveryPriority = "cost_control" | "balanced" | "coverage_quality";
export type DiscoveryBudgetLevel = "tight_budget" | "moderate_budget" | "high_budget";

export type DiscoveryInputs = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: DiscoveryIndustry;
  employeeEstimate: number;
  locationCount: number;
  hazards: DiscoveryHazard[];
  prescriptionMix: DiscoveryPrescriptionMix;
  currentProgramModel: DiscoveryCurrentProgramModel;
  priority: DiscoveryPriority;
  budgetLevel: DiscoveryBudgetLevel;
  renewalFrequency: EligibilityFrequency;
  hasDistinctDepartments: boolean;
  requiresManagerApproval: boolean;
  primaryStreet: string;
  primaryCity: string;
  primaryState: string;
  primaryZip: string;
  additionalNotes: string;
};

export type DiscoveryRecommendation = {
  patch: DraftPatch;
  recommendedEU: EUPackage;
  recommendedTier: ServiceTier;
  summaryNote: string;
};

export const DEFAULT_DISCOVERY_INPUTS: DiscoveryInputs = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  industry: "manufacturing",
  employeeEstimate: 50,
  locationCount: 1,
  hazards: [],
  prescriptionMix: "mixed_prescription_and_non_prescription",
  currentProgramModel: "voucher",
  priority: "balanced",
  budgetLevel: "moderate_budget",
  renewalFrequency: "annual",
  hasDistinctDepartments: false,
  requiresManagerApproval: false,
  primaryStreet: "",
  primaryCity: "",
  primaryState: "",
  primaryZip: "",
  additionalNotes: "",
};

const HAZARD_LABELS: Record<DiscoveryHazard, string> = {
  impact: "High impact",
  dust_debris: "Dust or debris",
  chemical_splash: "Chemical splash",
  outdoor_glare: "Outdoor glare",
  fog_humidity: "Fog or humidity",
  indoor_outdoor_shift: "Workers move indoor/outdoor",
  screen_intensive: "Screen-intensive work",
};

const INDUSTRY_LABELS: Record<DiscoveryIndustry, string> = {
  manufacturing: "Manufacturing",
  construction: "Construction",
  utilities: "Utilities",
  logistics: "Logistics and Warehousing",
  healthcare: "Healthcare",
  public_sector: "Public Sector",
  laboratory: "Laboratory",
  other: "Other",
};

const PROGRAM_MODEL_LABELS: Record<DiscoveryCurrentProgramModel, string> = {
  voucher: "Voucher",
  insurance: "Insurance plan",
  third_party_vendor: "Third-party vendor",
  none: "No current program",
};

const PRESCRIPTION_MIX_LABELS: Record<DiscoveryPrescriptionMix, string> = {
  mostly_prescription: "Mostly Prescription Wearers",
  mixed_prescription_and_non_prescription: "Mixed Prescription and Non-Prescription",
  bulk_over_the_glasses: "Bulk Over the Glasses",
  non_prescription_safety_eyewear: "Non-Prescription Safety Eyewear",
  unknown: "Unknown",
};

const PRIORITY_LABELS: Record<DiscoveryPriority, string> = {
  cost_control: "Cost Control",
  balanced: "Balanced",
  coverage_quality: "Coverage Quality",
};

const BUDGET_LEVEL_LABELS: Record<DiscoveryBudgetLevel, string> = {
  tight_budget: "Need to Keep Costs Tight",
  moderate_budget: "Working With a Moderate Budget",
  high_budget: "Able to Invest for Best Coverage",
};

const ADD_ON_LABELS: Partial<Record<EUPackageAddOnKey, string>> = {
  polarized: "Polarized",
  antiFog: "Anti-Fog",
  antiReflectiveStd: "Anti-Reflective",
  blueLightAntiReflective: "Blue Light + Anti-Reflective",
  tint: "Tint",
  transitions: "Transitions",
  transitionsPolarized: "Transitions Polarized",
  extraScratchCoating: "Extra Scratch Coating",
};

function clampPositiveInt(value: number, fallback = 1) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

function emptyEuAddOns(): Record<EUPackageAddOnKey, boolean> {
  return {
    polarized: false,
    antiFog: false,
    antiReflectiveStd: false,
    blueLightAntiReflective: false,
    tint: false,
    transitions: false,
    transitionsPolarized: false,
    extraScratchCoating: false,
  };
}

function determineCoverageType(prescriptionMix: DiscoveryPrescriptionMix): CoverageType {
  if (
    prescriptionMix === "bulk_over_the_glasses" ||
    prescriptionMix === "non_prescription_safety_eyewear"
  ) {
    return "plano_only";
  }
  if (prescriptionMix === "mostly_prescription") return "prescription_only";
  return "prescription_and_plano";
}

function determineSideShieldType(hazards: DiscoveryHazard[]): SideShieldType {
  if (
    hazards.includes("impact") ||
    hazards.includes("dust_debris") ||
    hazards.includes("chemical_splash")
  ) {
    return "permanent";
  }
  return "removable";
}

function determineAllowanceScope(inputs: DiscoveryInputs): AllowanceScope {
  if (inputs.hasDistinctDepartments || inputs.locationCount >= 4) {
    return "department_based";
  }
  return "companywide";
}

function recommendEuPackage(inputs: DiscoveryInputs): EUPackage {
  const hazardLoad = inputs.hazards.length;
  const employees = clampPositiveInt(inputs.employeeEstimate, 1);
  const locationCount = clampPositiveInt(inputs.locationCount, 1);

  if (
    inputs.priority === "cost_control" &&
    (inputs.prescriptionMix === "bulk_over_the_glasses" ||
      inputs.prescriptionMix === "non_prescription_safety_eyewear") &&
    hazardLoad <= 1 &&
    locationCount <= 2 &&
    inputs.budgetLevel === "tight_budget"
  ) {
    return "Compliance";
  }

  let score = 0;
  score += Math.min(hazardLoad, 4);

  if (inputs.prescriptionMix === "mostly_prescription") score += 2;
  if (inputs.prescriptionMix === "mixed_prescription_and_non_prescription") score += 1;

  if (inputs.priority === "balanced") score += 1;
  if (inputs.priority === "coverage_quality") score += 2;
  if (inputs.budgetLevel === "high_budget") score += 1;
  if (inputs.budgetLevel === "tight_budget") score -= 1;

  if (employees >= 250) score += 1;
  if (employees >= 800) score += 1;
  if (locationCount >= 4) score += 1;
  if (inputs.currentProgramModel === "none") score += 1;
  if (inputs.hasDistinctDepartments) score += 1;

  if (score >= 8) return "Covered";
  if (score >= 6) return "Complete";
  if (score >= 4) return "Comfort";
  return "Compliance";
}

function recommendServiceTier(inputs: DiscoveryInputs, eu: EUPackage): ServiceTier {
  const employees = clampPositiveInt(inputs.employeeEstimate, 1);
  const locationCount = clampPositiveInt(inputs.locationCount, 1);

  let score = 0;

  if (employees >= 1000) score += 3;
  else if (employees >= 500) score += 2;
  else if (employees >= 150) score += 1;

  if (locationCount >= 10) score += 3;
  else if (locationCount >= 5) score += 2;
  else if (locationCount >= 2) score += 1;

  if (inputs.requiresManagerApproval) score += 1;
  if (inputs.priority === "coverage_quality") score += 1;
  if (inputs.currentProgramModel === "third_party_vendor") score += 1;
  if (inputs.budgetLevel === "high_budget") score += 1;
  if (inputs.budgetLevel === "tight_budget") score -= 1;

  let tier: ServiceTier;
  if (score >= 7) tier = "Enterprise";
  else if (score >= 5) tier = "Premier";
  else if (score >= 3) tier = "Access";
  else tier = "Essential";

  if ((eu === "Complete" || eu === "Covered") && tier === "Essential") {
    return "Access";
  }

  return tier;
}

function recommendEuAddOns(inputs: DiscoveryInputs): Record<EUPackageAddOnKey, boolean> {
  const addOns = emptyEuAddOns();

  if (inputs.hazards.includes("fog_humidity")) {
    addOns.antiFog = true;
  }
  if (inputs.hazards.includes("screen_intensive")) {
    addOns.blueLightAntiReflective = true;
  }
  if (inputs.hazards.includes("outdoor_glare")) {
    addOns.polarized = true;
  }
  if (inputs.hazards.includes("indoor_outdoor_shift")) {
    addOns.transitions = true;
  }
  if (inputs.hazards.includes("dust_debris")) {
    addOns.extraScratchCoating = true;
  }
  if (inputs.hazards.includes("chemical_splash")) {
    addOns.tint = true;
  }

  if (inputs.hazards.includes("outdoor_glare") && inputs.hazards.includes("indoor_outdoor_shift")) {
    addOns.transitionsPolarized = true;
    addOns.polarized = false;
    addOns.transitions = false;
  }

  if (addOns.blueLightAntiReflective) {
    addOns.antiReflectiveStd = false;
    addOns.extraScratchCoating = false;
  }

  if (addOns.antiReflectiveStd) {
    addOns.extraScratchCoating = false;
  }

  return addOns;
}

function buildDepartmentConfigs(
  totalEmployees: number,
  euAddOns: Record<EUPackageAddOnKey, boolean>
) {
  const normalizedEmployees = Math.max(2, totalEmployees);
  let primaryCount = Math.max(1, Math.floor(normalizedEmployees * 0.6));
  let secondaryCount = normalizedEmployees - primaryCount;

  if (secondaryCount < 1) {
    secondaryCount = 1;
    primaryCount = normalizedEmployees - 1;
  }

  const primaryDept = makeDepartmentConfigRow();
  primaryDept.name = "Primary Operations";
  primaryDept.employeeCount = primaryCount;
  primaryDept.selections = { euPackageAddOns: { ...euAddOns } };

  const secondaryDept = makeDepartmentConfigRow();
  secondaryDept.name = "Secondary Operations";
  secondaryDept.employeeCount = secondaryCount;
  secondaryDept.selections = { euPackageAddOns: { ...euAddOns } };

  return [primaryDept, secondaryDept];
}

export function buildDiscoveryRecommendation(inputs: DiscoveryInputs): DiscoveryRecommendation {
  const employeeEstimate = clampPositiveInt(inputs.employeeEstimate, 1);
  const locationCount = clampPositiveInt(inputs.locationCount, 1);
  const recommendedEU = recommendEuPackage(inputs);
  const recommendedTier = recommendServiceTier(inputs, recommendedEU);
  const coverageType = determineCoverageType(inputs.prescriptionMix);
  const allowanceScope = determineAllowanceScope(inputs);
  const sideShieldType = determineSideShieldType(inputs.hazards);
  const euPackageAddOns = recommendEuAddOns(inputs);

  const defaultLocation = makeDefaultLocations()[0];
  const locations = [
    {
      ...defaultLocation,
      label: "Primary Location",
      streetAddress: inputs.primaryStreet.trim(),
      city: inputs.primaryCity.trim(),
      state: inputs.primaryState.trim(),
      zipCode: inputs.primaryZip.trim(),
      status: "idle" as const,
      statusMessage:
        inputs.primaryStreet.trim() && inputs.primaryCity.trim() && inputs.primaryState.trim()
          ? "Discovery location captured."
          : defaultLocation.statusMessage,
    },
  ];

  const hazardsLabel =
    inputs.hazards.length > 0 ? inputs.hazards.map((hazard) => HAZARD_LABELS[hazard]).join(", ") : "Not provided";

  const summaryNote = [
    "Discovery Intake Summary",
    `Industry: ${INDUSTRY_LABELS[inputs.industry]}`,
    `Employee Estimate: ${employeeEstimate}`,
    `Location Estimate: ${locationCount}`,
    `Hazards: ${hazardsLabel}`,
    `Prescription Mix: ${PRESCRIPTION_MIX_LABELS[inputs.prescriptionMix]}`,
    `Current Program: ${PROGRAM_MODEL_LABELS[inputs.currentProgramModel]}`,
    `Program Priority: ${PRIORITY_LABELS[inputs.priority]}`,
    `Budget Level: ${BUDGET_LEVEL_LABELS[inputs.budgetLevel]}`,
    `EU Package: ${recommendedEU}`,
    `Service Tier: ${recommendedTier}`,
    `Add-Ons: ${
      Object.entries(euPackageAddOns)
        .filter(([, enabled]) => enabled)
        .map(([key]) => ADD_ON_LABELS[key as EUPackageAddOnKey] ?? key)
        .join(", ") || "None"
    }`,
    inputs.additionalNotes.trim() ? `Additional notes: ${inputs.additionalNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const patch: DraftPatch = {
    builder: {
      guidelines: {
        sideShieldType,
        eligibilityFrequency: inputs.renewalFrequency,
        coverageType,
        allowanceScope,
        approvalWorkflowEnabled: inputs.requiresManagerApproval,
        restrictions: {
          restrictSunglassOptions: false,
          restrictUvReactivePhotochromicLenses: false,
        },
        notes: summaryNote,
      },
    },
    calculator: {
      eligibleEmployees: employeeEstimate,
      selectedEU: recommendedEU,
      selectedTier: recommendedTier,
      paymentTerms: "NET30",
      paymentDiscount: "none",
      addOns: {
        euPackageAddOns,
        nonPrescriptionCustomSafetyGlasses: coverageType !== "prescription_only",
        extraSiteVisits: 0,
      },
      departmentAllowances: [],
      departmentConfigs:
        allowanceScope === "department_based" ? buildDepartmentConfigs(employeeEstimate, euPackageAddOns) : [],
      locations,
      contact: {
        companyName: inputs.companyName.trim(),
        fullName: inputs.contactName.trim(),
        email: inputs.contactEmail.trim(),
        phone: inputs.contactPhone.trim(),
      },
    },
  };

  return {
    patch,
    recommendedEU,
    recommendedTier,
    summaryNote,
  };
}
