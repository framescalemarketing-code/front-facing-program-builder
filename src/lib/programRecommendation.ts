import type {
  DraftPatch,
  EUPackage,
  EUPackageAddOnKey,
  ServiceTier,
} from "@/lib/programDraft";
import {
  deriveComplexityTier,
  type CurrentSafetySetup,
  type ProgramBudgetPreference,
  type ProgramConfig,
  type ProgramExposureRisk,
  type ProgramLocationModel,
  type ProgramWorkType,
} from "@/lib/programConfig";
import {
  recommendProgram,
  type RecommendProgramInputs,
  type RecommendationAddOn,
} from "@/lib/recommendProgram";

export type RecommendationInputs = Omit<
  RecommendProgramInputs,
  | "workType"
  | "coverageSizeBand"
  | "locationModel"
  | "exposureRisks"
  | "currentSafetySetup"
  | "budgetPreference"
  | "selectedAddOns"
> & {
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  companyName: string;
  address1: string;
  city: string;
  state: string;
  zip: string;

  workType: ProgramWorkType;
  coverageSizeBand: NonNullable<
    ProgramConfig["programProfile"]["coverageSizeBand"]
  >;
  locationModel: ProgramLocationModel;
  exposureRisks: ProgramExposureRisk[];
  currentSafetySetup: CurrentSafetySetup[];
  budgetPreference?: ProgramBudgetPreference;
  selectedAddOns: RecommendationAddOn[];
};

export const DEFAULT_RECOMMENDATION_INPUTS: RecommendationInputs = {
  contactName: "",
  contactRole: "",
  email: "",
  phone: "",
  companyName: "",
  address1: "",
  city: "",
  state: "",
  zip: "",
  workType: "manufacturing",
  coverageSizeBand: "51_100",
  locationModel: "single",
  exposureRisks: [],
  currentSafetySetup: [],
  budgetPreference: undefined,
  selectedAddOns: [],
};

const EU_ADD_ON_KEYS: EUPackageAddOnKey[] = [
  "polarized",
  "antiFog",
  "antiReflectiveStd",
  "blueLightAntiReflective",
  "tint",
  "transitions",
  "transitionsPolarized",
  "extraScratchCoating",
];

function nowIso() {
  return new Date().toISOString();
}

function employeesRepresentative(
  band: RecommendationInputs["coverageSizeBand"],
) {
  if (band === "1_50") return 30;
  if (band === "51_100") return 75;
  if (band === "101_200") return 150;
  return 250; // 201_plus
}

function locationsRepresentative(model: ProgramLocationModel) {
  if (model === "single") return 1;
  if (model === "multi_same_region") return 4;
  return 10;
}

function deriveDeliverySignals(setup: CurrentSafetySetup[]) {
  const signals: Array<"onsite" | "regional" | "mail" | "hybrid"> = [];
  if (setup.includes("onsite_events")) signals.push("onsite");
  if (setup.includes("regional_service_centers")) signals.push("regional");
  if (setup.includes("mail_fulfillment")) signals.push("mail");
  if (setup.includes("employee_self_order")) signals.push("mail");
  if (setup.includes("voucher")) signals.push("mail");
  if (setup.includes("hybrid_delivery") || setup.includes("hybrid_model")) {
    signals.push("hybrid");
  }
  return signals;
}

function deriveApprovalSignals(setup: CurrentSafetySetup[]) {
  const signals: Array<"none" | "manager" | "centralized"> = [];
  if (setup.includes("approval_required")) signals.push("manager");
  if (setup.includes("centralized_safety_approval")) {
    signals.push("centralized");
  }
  if (setup.includes("manager_approval_required")) signals.push("manager");
  if (!signals.length) signals.push("none");
  return signals;
}

function deriveApprovalModel(
  setup: CurrentSafetySetup[],
): ProgramConfig["approvalModel"] {
  if (setup.includes("centralized_safety_approval")) {
    return {
      model: "centralized_safety",
      notes:
        "Centralized review supports consistent compliance rules across sites.",
    };
  }

  if (
    setup.includes("approval_required") ||
    setup.includes("manager_approval_required")
  ) {
    return {
      model: "manager",
      notes:
        "Approval-required workflow adds control but can increase turnaround time for orders.",
    };
  }

  return { model: "none", notes: "No formal approval step selected." };
}

function deriveDeliveryModel(
  setup: CurrentSafetySetup[],
): ProgramConfig["deliveryModel"] {
  if (setup.includes("hybrid_delivery") || setup.includes("hybrid_model")) {
    return {
      primary: "hybrid",
      notes: "Hybrid delivery supports mixed site access and shipping.",
    };
  }

  if (setup.includes("onsite_events")) {
    return {
      primary: "onsite",
      notes: "Onsite events support high engagement and fit support.",
    };
  }

  if (setup.includes("regional_service_centers")) {
    return {
      primary: "regional_centers",
      notes: "Regional centers support distributed scheduling.",
    };
  }

  if (setup.includes("employee_self_order")) {
    return {
      primary: "mail",
      notes:
        "Employees self-order through approved channels with defined policy guardrails.",
    };
  }

  if (setup.includes("voucher")) {
    return {
      primary: "mail",
      notes:
        "Voucher-based ordering routes employees through approved purchase channels.",
    };
  }

  if (setup.includes("mail_fulfillment")) {
    return {
      primary: "mail",
      notes:
        "Online ordering supports distributed teams without onsite visits.",
    };
  }

  return { primary: "unknown", notes: "Delivery approach not specified." };
}

function deriveCoverageTypeFromSetup(setup: CurrentSafetySetup[]) {
  if (setup.includes("hybrid_eyewear"))
    return "prescription_and_plano" as const;
  if (
    setup.includes("otg_non_prescription_eyewear") ||
    setup.includes("non_prescription_safety_eyewear")
  ) {
    return "plano_only" as const;
  }
  return "prescription_only" as const;
}

function allowanceScopeForInputs(inputs: RecommendationInputs) {
  const employees = employeesRepresentative(inputs.coverageSizeBand);
  const locations = locationsRepresentative(inputs.locationModel);
  return locations >= 4 || employees >= 200
    ? "department_based"
    : "companywide";
}

function budgetPlanningNote(
  budgetPreference: ProgramBudgetPreference | undefined,
  serviceTier: ServiceTier,
) {
  if (budgetPreference === "super_strict") {
    return `Budget goals: Compliance First. Suggested service tier: ${serviceTier}.`;
  }
  if (budgetPreference === "low_budget") {
    return `Budget goals: Operations Focused. Suggested service tier: ${serviceTier}.`;
  }
  if (budgetPreference === "unlimited_budget") {
    return `Budget goals: Full Program Investment. Suggested service tier: ${serviceTier}.`;
  }
  if (budgetPreference === "good_budget") {
    return `Budget goals: Ready to Grow. Suggested service tier: ${serviceTier}.`;
  }
  return `Budget goals not selected. Suggested service tier: ${serviceTier}.`;
}

function addOnKeyForRecommendation(
  addOn: RecommendationAddOn,
): EUPackageAddOnKey {
  if (addOn === "Anti fog") return "antiFog";
  if (addOn === "Blue light") return "blueLightAntiReflective";
  if (addOn === "Polarized sunglasses") return "polarized";
  return "transitions";
}

function recommendedAddOnsPatch(addOns: RecommendationAddOn[]) {
  const set = new Set(addOns.map((addOn) => addOnKeyForRecommendation(addOn)));
  return EU_ADD_ON_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: set.has(key) }),
    {} as Record<EUPackageAddOnKey, boolean>,
  );
}

export function buildProgramRecommendation(inputs: RecommendationInputs): {
  programConfig: ProgramConfig;
  draftPatch: DraftPatch;
} {
  const employees = employeesRepresentative(inputs.coverageSizeBand);
  const locations = locationsRepresentative(inputs.locationModel);
  const deliverySignals = deriveDeliverySignals(inputs.currentSafetySetup);
  const approvalSignals = deriveApprovalSignals(inputs.currentSafetySetup);
  const postureTier = deriveComplexityTier({
    employees,
    locations,
    exposureCount: inputs.exposureRisks.length,
    deliverySignals,
    approvalSignals,
  });

  const recommendation = recommendProgram(inputs);
  const recommendedStructure: ProgramConfig["recommendedStructure"] = {
    serviceTier: recommendation.serviceTier,
    allowanceScope: allowanceScopeForInputs(inputs),
  };
  const approvalModel = deriveApprovalModel(inputs.currentSafetySetup);
  const deliveryModel = deriveDeliveryModel(inputs.currentSafetySetup);
  const coverageType = deriveCoverageTypeFromSetup(inputs.currentSafetySetup);
  const rationaleNotes =
    recommendation.rationale.length > 0
      ? ` Rule trace: ${recommendation.rationale.join(" | ")}.`
      : "";

  // Per-location recommendations: for multi-site programs each location is its
  // own cost center and program entity. Build a placeholder per-location record
  // that the summary can render for each site. The EU/tier mirrors the overall
  // recommendation — specialists confirm final per-location split on first call.
  const isMultiSite = inputs.locationModel !== "single";
  const locationRecommendations: ProgramConfig["locationRecommendations"] =
    isMultiSite
      ? [
          {
            locationLabel: "Each Location",
            euPackage: recommendation.euPackage,
            serviceTier: recommendation.serviceTier,
            note:
              "Each of your locations is structured as its own program entity and cost center. The EU package and service tier apply per location, and your specialist will confirm final rollout details for each site on the first call.",
          },
        ]
      : undefined;

  const programConfig: ProgramConfig = {
    programConfigVersion: 1,
    generatedAtIso: nowIso(),
    source: "recommendation",
    company: {
      companyName: inputs.companyName.trim(),
      contactName: inputs.contactName.trim(),
      role: inputs.contactRole.trim(),
      email: inputs.email.trim(),
      phone: inputs.phone.trim(),
      address1: inputs.address1.trim(),
      city: inputs.city.trim(),
      state: inputs.state.trim(),
      zip: inputs.zip.trim(),
    },
    programProfile: {
      workType: inputs.workType,
      coverageSizeBand: inputs.coverageSizeBand,
      locationModel: inputs.locationModel,
      exposureRisks: inputs.exposureRisks,
      currentSafetySetup: inputs.currentSafetySetup,
      budgetPreference: inputs.budgetPreference,
    },
    recommendedStructure,
    deliveryModel,
    approvalModel,
    planningNotes: `${budgetPlanningNote(
      inputs.budgetPreference,
      recommendation.serviceTier,
    )}${rationaleNotes} Final program scope is confirmed during specialist review.`,
    upgradeOptions: recommendation.upgradeOptions ?? undefined,
    postureTier,
    coatingRecommendations: recommendation.coatingRecommendations,
    locationRecommendations,
  };

  const draftPatch: DraftPatch = {
    builder: {
      guidelines: {
        sideShieldType: "permanent",
        eligibilityFrequency: "annual",
        coverageType,
        allowanceScope: recommendedStructure.allowanceScope ?? "companywide",
        approvalWorkflowEnabled:
          approvalModel.model === "manager" ||
          approvalModel.model === "centralized_safety",
        restrictions: {
          restrictSunglassOptions: false,
          restrictUvReactivePhotochromicLenses: false,
        },
        notes: "",
      },
    },
    program: {
      eligibleEmployees: employees,
      selectedEU: recommendation.euPackage as EUPackage | "",
      selectedTier: recommendation.serviceTier as ServiceTier | "",
      addOns: {
        euPackageAddOns: recommendedAddOnsPatch(recommendation.addOns),
        nonPrescriptionCustomSafetyGlasses: false,
        extraSiteVisits: 0,
      },
      contact: {
        companyName: inputs.companyName.trim(),
        fullName: inputs.contactName.trim(),
        role: inputs.contactRole.trim(),
        email: inputs.email.trim(),
        phone: inputs.phone.trim(),
      },
    },
    programConfig: {
      active: programConfig,
    },
  };

  return { programConfig, draftPatch };
}
