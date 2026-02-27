export type EUPackage = "Compliance" | "Comfort" | "Complete" | "Covered";
export type ServiceTier = "Essential" | "Access" | "Premier" | "Enterprise";

export type ProgramWorkType =
  | "manufacturing"
  | "construction"
  | "utilities"
  | "warehouse"
  | "healthcare"
  | "public_sector"
  | "laboratory"
  | "other";

export type CoverageSizeBand =
  | "1_30"
  | "31_60"
  | "61_100"
  | "101_250"
  | "251_500"
  | "500_plus";

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

export type RecommendationAddOn =
  | "Anti fog"
  | "Blue light"
  | "Polarized sunglasses"
  | "Transitions";

export type RecommendProgramInputs = {
  workType?: ProgramWorkType;
  coverageSizeBand?: CoverageSizeBand;
  locationModel?: ProgramLocationModel;
  exposureRisks?: ProgramExposureRisk[];
  currentSafetySetup?: CurrentSafetySetup[];
  budgetPreference?: ProgramBudgetPreference;
  selectedAddOns?: RecommendationAddOn[];
};

export type RecommendProgramResult = {
  euPackage: EUPackage;
  serviceTier: ServiceTier;
  addOns: RecommendationAddOn[];
  rationale: string[];
  recommendedEuPackage: EUPackage;
  recommendedServiceTier: ServiceTier;
  recommendedAddOns: RecommendationAddOn[];
};

type CustomerProfile =
  | "minimum_standard_compliance_managers"
  | "administrative_load_minimizers"
  | "safety_culture_champions"
  | "efficiency_and_productivity_optimizers";

const EU_ORDER: EUPackage[] = [
  "Compliance",
  "Comfort",
  "Complete",
  "Covered",
];

const TIER_ORDER: ServiceTier[] = [
  "Essential",
  "Access",
  "Premier",
  "Enterprise",
];

const GROUP_A_INDUSTRIES = new Set<ProgramWorkType>([
  "manufacturing",
  "construction",
  "warehouse",
]);

const GROUP_B_INDUSTRIES = new Set<ProgramWorkType>([
  "utilities",
  "healthcare",
  "public_sector",
  "laboratory",
]);

const GROUP_A_BASE_EXPOSURES = new Set<ProgramExposureRisk>([
  "high_impact",
  "dust_debris",
]);

const COMFORT_SIGNAL_EXPOSURES = new Set<ProgramExposureRisk>([
  "fog_humidity",
  "screen_intensive",
  "outdoor_glare",
  "indoor_outdoor_shift",
]);

const ADMIN_SETUP_SIGNALS = new Set<CurrentSafetySetup>([
  "approval_required",
  "manager_approval_required",
  "centralized_safety_approval",
  "voucher",
  "vendor_optometry_partnership",
]);

const ADD_ON_ORDER: RecommendationAddOn[] = [
  "Anti fog",
  "Blue light",
  "Polarized sunglasses",
  "Transitions",
];

const HAZARD_ADD_ON_MAP: Partial<
  Record<ProgramExposureRisk, RecommendationAddOn>
> = {
  fog_humidity: "Anti fog",
  screen_intensive: "Blue light",
  outdoor_glare: "Polarized sunglasses",
  indoor_outdoor_shift: "Transitions",
};

function rankOf<T extends string>(order: T[], value: T): number {
  return order.indexOf(value);
}

function escalateEu(current: EUPackage, minimum: EUPackage): EUPackage {
  return rankOf(EU_ORDER, current) >= rankOf(EU_ORDER, minimum)
    ? current
    : minimum;
}

function escalateTier(
  current: ServiceTier,
  minimum: ServiceTier
): ServiceTier {
  return rankOf(TIER_ORDER, current) >= rankOf(TIER_ORDER, minimum)
    ? current
    : minimum;
}

function clampToAllowed<T extends string>(
  current: T,
  ordered: T[],
  allowed: T[]
): T {
  if (allowed.includes(current)) return current;

  if (allowed.length === 1) return allowed[0];

  const currentRank = rankOf(ordered, current);
  const allowedRanks = allowed
    .map((value) => rankOf(ordered, value))
    .filter((rank) => rank >= 0);

  const nearestDown = [...allowedRanks]
    .sort((a, b) => b - a)
    .find((rank) => rank <= currentRank);
  if (typeof nearestDown === "number") return ordered[nearestDown];

  const nearestUp = [...allowedRanks]
    .sort((a, b) => a - b)
    .find((rank) => rank > currentRank);
  if (typeof nearestUp === "number") return ordered[nearestUp];

  return current;
}

function dedupeAddOns(addOns: RecommendationAddOn[]): RecommendationAddOn[] {
  const set = new Set(addOns);
  return ADD_ON_ORDER.filter((addOn) => set.has(addOn));
}

function hasOnsiteOrHybrid(setup: CurrentSafetySetup[]): boolean {
  return (
    setup.includes("onsite_events") ||
    setup.includes("hybrid_delivery") ||
    setup.includes("hybrid_model")
  );
}

function serviceTierForGroupABase(
  coverageSizeBand: CoverageSizeBand
): ServiceTier {
  if (coverageSizeBand === "1_30" || coverageSizeBand === "31_60") {
    return "Access";
  }
  if (coverageSizeBand === "61_100" || coverageSizeBand === "101_250") {
    return "Access";
  }
  if (coverageSizeBand === "251_500") {
    return "Premier";
  }
  return "Premier";
}

function serviceTierForServiceModelOverride(
  coverageSizeBand: CoverageSizeBand
): ServiceTier {
  if (
    coverageSizeBand === "1_30" ||
    coverageSizeBand === "31_60" ||
    coverageSizeBand === "61_100"
  ) {
    return "Access";
  }
  if (coverageSizeBand === "101_250" || coverageSizeBand === "251_500") {
    return "Premier";
  }
  return "Enterprise";
}

function inferProfile(args: {
  coverageSizeBand: CoverageSizeBand;
  locationModel: ProgramLocationModel;
  exposureRisks: ProgramExposureRisk[];
  currentSafetySetup: CurrentSafetySetup[];
  budgetPreference?: ProgramBudgetPreference;
  selectedAddOns: RecommendationAddOn[];
}): CustomerProfile {
  const {
    coverageSizeBand,
    locationModel,
    exposureRisks,
    currentSafetySetup,
    budgetPreference,
    selectedAddOns,
  } = args;

  const noFormalProgram = currentSafetySetup.includes("no_formal_program");
  const hasComfortSignals =
    selectedAddOns.length > 0 ||
    exposureRisks.some((risk) => COMFORT_SIGNAL_EXPOSURES.has(risk));
  const hasAdminSignals =
    locationModel === "multi_same_region" ||
    currentSafetySetup.some((setup) => ADMIN_SETUP_SIGNALS.has(setup));
  const hasPerformanceSignals =
    hasOnsiteOrHybrid(currentSafetySetup) ||
    locationModel === "multi_across_regions" ||
    coverageSizeBand === "500_plus" ||
    budgetPreference === "unlimited_budget";

  if (hasPerformanceSignals) {
    return "efficiency_and_productivity_optimizers";
  }

  if (
    noFormalProgram ||
    budgetPreference === "super_strict" ||
    coverageSizeBand === "1_30"
  ) {
    return "minimum_standard_compliance_managers";
  }

  if (hasComfortSignals) {
    return "safety_culture_champions";
  }

  if (hasAdminSignals) {
    return "administrative_load_minimizers";
  }

  return "administrative_load_minimizers";
}

function tieBreakerTarget(args: {
  profile: CustomerProfile;
  coverageSizeBand: CoverageSizeBand;
  locationModel: ProgramLocationModel;
  currentSafetySetup: CurrentSafetySetup[];
  budgetPreference?: ProgramBudgetPreference;
}): { euPackage: EUPackage; serviceTier: ServiceTier } {
  const {
    profile,
    coverageSizeBand,
    locationModel,
    currentSafetySetup,
    budgetPreference,
  } = args;
  const performanceJustified =
    locationModel === "multi_across_regions" ||
    coverageSizeBand === "500_plus" ||
    budgetPreference === "unlimited_budget" ||
    hasOnsiteOrHybrid(currentSafetySetup);

  if (profile === "minimum_standard_compliance_managers") {
    return {
      euPackage: "Compliance",
      serviceTier: coverageSizeBand === "1_30" ? "Essential" : "Access",
    };
  }

  if (profile === "administrative_load_minimizers") {
    return {
      euPackage:
        coverageSizeBand === "251_500" || coverageSizeBand === "500_plus"
          ? "Complete"
          : "Comfort",
      serviceTier:
        locationModel === "multi_same_region" ||
        coverageSizeBand === "251_500" ||
        coverageSizeBand === "500_plus"
          ? "Premier"
          : "Access",
    };
  }

  if (profile === "safety_culture_champions") {
    return { euPackage: "Complete", serviceTier: "Premier" };
  }

  if (performanceJustified) {
    return { euPackage: "Covered", serviceTier: "Enterprise" };
  }

  return { euPackage: "Complete", serviceTier: "Premier" };
}

function budgetConstraint(
  budgetPreference: ProgramBudgetPreference
): { allowedEu: EUPackage[]; allowedTier: ServiceTier[]; label: string } {
  if (budgetPreference === "super_strict") {
    return {
      allowedEu: ["Compliance", "Comfort"],
      allowedTier: ["Essential", "Access"],
      label: "Lean Essentials",
    };
  }

  if (budgetPreference === "low_budget") {
    return {
      allowedEu: ["Comfort"],
      allowedTier: ["Access"],
      label: "Cost Smart Growth",
    };
  }

  if (budgetPreference === "good_budget") {
    return {
      allowedEu: ["Compliance", "Comfort", "Complete"],
      allowedTier: ["Essential", "Access", "Premier"],
      label: "Balanced",
    };
  }

  return {
    allowedEu: ["Covered"],
    allowedTier: ["Enterprise"],
    label: "Performance First",
  };
}

export function recommendProgram(
  rawInputs: RecommendProgramInputs
): RecommendProgramResult {
  const workType = rawInputs.workType ?? "manufacturing";
  const coverageSizeBand = rawInputs.coverageSizeBand ?? "31_60";
  const locationModel = rawInputs.locationModel ?? "single";
  const exposureRisks = rawInputs.exposureRisks ?? [];
  const currentSafetySetup = rawInputs.currentSafetySetup ?? [];
  const budgetPreference = rawInputs.budgetPreference;
  const selectedAddOns = dedupeAddOns(rawInputs.selectedAddOns ?? []);

  const rationale: string[] = [];
  const inGroupA = GROUP_A_INDUSTRIES.has(workType);
  const inGroupB = GROUP_B_INDUSTRIES.has(workType);
  const onlyGroupABaseExposures = exposureRisks.every((risk) =>
    GROUP_A_BASE_EXPOSURES.has(risk)
  );
  const isMultiLocation = locationModel !== "single";
  const isNoFormalProgram = currentSafetySetup.includes("no_formal_program");
  const usesOnsiteOrHybrid = hasOnsiteOrHybrid(currentSafetySetup);

  let euPackage: EUPackage = "Compliance";
  let serviceTier: ServiceTier = "Essential";
  let euFromExplicitRule = false;
  let tierFromExplicitRule = false;

  // Priority order:
  // 1) Compute base recommendation from industry group A or B
  // 2) Apply location based escalations
  // 3) Apply service model overrides
  // 4) Apply no formal program special case
  // 5) Apply add on inference and add on based escalation where specified
  // 6) Apply customer profile tie breaker if any conflicts remain
  // 7) Apply budget posture hard constraints and clamping

  // 1) Base by industry group
  if (inGroupA && onlyGroupABaseExposures) {
    euPackage = "Compliance";
    serviceTier = serviceTierForGroupABase(coverageSizeBand);
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
    rationale.push("Base: Group A with allowed exposures -> Compliance + size tier.");
  } else if (inGroupB) {
    euPackage = "Comfort";
    serviceTier = "Access";
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
    rationale.push("Base: Group B starts at Comfort + Access.");
  } else {
    rationale.push("Base: No direct industry rule, waiting for tie breaker.");
  }

  // 2) Location based escalations
  if (inGroupB) {
    if (isMultiLocation || coverageSizeBand === "500_plus") {
      euPackage = escalateEu(euPackage, "Covered");
      euFromExplicitRule = true;
      rationale.push("Escalation: Group B multi-site or 500+ -> EU Covered.");
    }

    if (locationModel === "multi_same_region") {
      serviceTier = escalateTier(serviceTier, "Premier");
      tierFromExplicitRule = true;
      rationale.push("Escalation: Same-region multi-site -> Tier Premier.");
    }

    if (locationModel === "multi_across_regions") {
      serviceTier = escalateTier(serviceTier, "Enterprise");
      tierFromExplicitRule = true;
      rationale.push("Escalation: Cross-region multi-site -> Tier Enterprise.");
    }
  }

  // 3) Service model overrides
  if (usesOnsiteOrHybrid) {
    serviceTier = serviceTierForServiceModelOverride(coverageSizeBand);
    tierFromExplicitRule = true;
    rationale.push("Override: Onsite/Hybrid selected -> tier by employee bucket.");
  }

  // 4) No formal program special case
  if (isNoFormalProgram && coverageSizeBand === "1_30") {
    euPackage = "Compliance";
    serviceTier = "Essential";
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
    rationale.push("Special case: No formal program + 1 to 30 -> Compliance + Essential.");
  }

  // 5) Add-on inference and add-on based escalation
  const inferredAddOns = inGroupA
    ? dedupeAddOns(
        exposureRisks
          .map((risk) => HAZARD_ADD_ON_MAP[risk])
          .filter((addOn): addOn is RecommendationAddOn => Boolean(addOn))
      )
    : [];
  const addOns = dedupeAddOns([...selectedAddOns, ...inferredAddOns]);

  if (inferredAddOns.length > 0) {
    rationale.push(
      `Inference: Hazards map to add-ons -> ${inferredAddOns.join(", ")}.`
    );
  }

  if (inGroupB && selectedAddOns.length >= 1) {
    serviceTier = escalateTier(serviceTier, "Premier");
    tierFromExplicitRule = true;
    rationale.push("Escalation: Group B with selected add-on(s) -> Tier Premier.");
  }

  // 6) Customer profile tie breaker (only unresolved axes)
  const profile = inferProfile({
    coverageSizeBand,
    locationModel,
    exposureRisks,
    currentSafetySetup,
    budgetPreference,
    selectedAddOns,
  });
  const tieTarget = tieBreakerTarget({
    profile,
    coverageSizeBand,
    locationModel,
    currentSafetySetup,
    budgetPreference,
  });

  if (!euFromExplicitRule) {
    euPackage = tieTarget.euPackage;
    rationale.push(`Tie breaker (${profile}) -> EU ${euPackage}.`);
  }

  if (!tierFromExplicitRule) {
    serviceTier = tieTarget.serviceTier;
    rationale.push(`Tie breaker (${profile}) -> Tier ${serviceTier}.`);
  }

  // 7) Budget hard constraints and clamping
  if (budgetPreference) {
    const constraints = budgetConstraint(budgetPreference);
    const beforeEu = euPackage;
    const beforeTier = serviceTier;

    euPackage = clampToAllowed(euPackage, EU_ORDER, constraints.allowedEu);
    serviceTier = clampToAllowed(
      serviceTier,
      TIER_ORDER,
      constraints.allowedTier
    );

    if (beforeEu !== euPackage || beforeTier !== serviceTier) {
      rationale.push(
        `Budget clamp (${constraints.label}) -> ${euPackage} + ${serviceTier}.`
      );
    }
  }

  return {
    euPackage,
    serviceTier,
    addOns,
    rationale,
    recommendedEuPackage: euPackage,
    recommendedServiceTier: serviceTier,
    recommendedAddOns: addOns,
  };
}
