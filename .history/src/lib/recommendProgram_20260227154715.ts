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

export type CoatingRecommendation = {
  id: string;
  label: string;
  description: string;
  reason: string;
};

export type RecommendProgramResult = {
  euPackage: EUPackage;
  serviceTier: ServiceTier;
  addOns: RecommendationAddOn[];
  rationale: string[];
  recommendedEuPackage: EUPackage;
  recommendedServiceTier: ServiceTier;
  recommendedAddOns: RecommendationAddOn[];
  coatingRecommendations: CoatingRecommendation[];
};

const EU_ORDER: EUPackage[] = ["Compliance", "Comfort", "Complete", "Covered"];

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

function escalateTier(current: ServiceTier, minimum: ServiceTier): ServiceTier {
  return rankOf(TIER_ORDER, current) >= rankOf(TIER_ORDER, minimum)
    ? current
    : minimum;
}

function clampToAllowed<T extends string>(
  current: T,
  ordered: T[],
  allowed: T[],
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

// ─── Budget constraint — affects EU package only ─────────────────────────────
// Service tier is driven by locations and team size, not budget.
// Budget influences the EU package level (coverage depth).
function budgetConstraint(
  budgetPreference: ProgramBudgetPreference,
  coverageSizeBand: CoverageSizeBand,
): { allowedEu: EUPackage[]; label: string } {
  const isLargeTeam =
    coverageSizeBand === "101_250" ||
    coverageSizeBand === "251_500" ||
    coverageSizeBand === "500_plus";

  if (budgetPreference === "super_strict") {
    return {
      allowedEu: ["Compliance", "Comfort"],
      label: "Compliance First",
    };
  }

  if (budgetPreference === "low_budget") {
    if (isLargeTeam) {
      return {
        allowedEu: ["Comfort", "Complete"],
        label: "Operationally Steady",
      };
    }
    return {
      allowedEu: ["Compliance", "Comfort", "Complete"],
      label: "Operationally Steady",
    };
  }

  if (budgetPreference === "good_budget") {
    return {
      allowedEu: ["Comfort", "Complete", "Covered"],
      label: "Growing the Program",
    };
  }

  // unlimited_budget
  return {
    allowedEu: ["Complete", "Covered"],
    label: "Full Investment",
  };
}

// ─── Coating Recommendation Engine ───────────────────────────────────────────

const ALL_COATINGS: Omit<CoatingRecommendation, "reason">[] = [
  {
    id: "anti_fog",
    label: "Anti-Fog",
    description:
      "Helps reduce lens fog in hot or humid environments, or in masked environments.",
  },
  {
    id: "anti_reflective",
    label: "Anti-Reflective",
    description: "Reduces glare and improves clarity in bright lighting.",
  },
  {
    id: "blue_light_filter",
    label: "Blue Light Filter",
    description:
      "Helps filter high-energy blue light from screens for more comfortable all-day viewing.",
  },
  {
    id: "extra_scratch_coating",
    label: "Extra Scratch Coating",
    description: "Adds durability for higher wear environments.",
  },
  {
    id: "transitions_sunglasses",
    label: "Transitions / Sunglasses",
    description:
      "Choose photochromic Transitions that adapt to UV exposure, or dedicated sunglasses for consistent sun glare reduction.",
  },
];

function findCoating(
  id: string,
): Omit<CoatingRecommendation, "reason"> | undefined {
  return ALL_COATINGS.find((c) => c.id === id);
}

export function recommendCoatings(inputs: {
  workType: ProgramWorkType;
  exposureRisks: ProgramExposureRisk[];
  locationModel: ProgramLocationModel;
  coverageSizeBand: CoverageSizeBand;
}): CoatingRecommendation[] {
  const { workType, exposureRisks } = inputs;
  const results = new Map<string, CoatingRecommendation>();

  function addCoating(id: string, reason: string) {
    if (results.has(id)) return;
    const coating = findCoating(id);
    if (!coating) return;
    results.set(id, { ...coating, reason });
  }

  // Exposure-based recommendations
  for (const risk of exposureRisks) {
    switch (risk) {
      case "fog_humidity":
        addCoating(
          "anti_fog",
          "Recommended for your fog and humidity exposure to maintain clear visibility.",
        );
        break;
      case "screen_intensive":
        addCoating(
          "blue_light_filter",
          "Recommended for screen-intensive work to reduce eye strain over long shifts.",
        );
        addCoating(
          "anti_reflective",
          "Reduces screen glare for more comfortable extended screen use.",
        );
        break;
      case "outdoor_glare":
        addCoating(
          "transitions_sunglasses",
          "Recommended for outdoor glare to maintain hazard awareness and comfort.",
        );
        addCoating(
          "anti_reflective",
          "Reduces glare for improved clarity during outdoor tasks.",
        );
        break;
      case "indoor_outdoor_shift":
        addCoating(
          "transitions_sunglasses",
          "Adapts to changing light conditions as your team moves between indoor and outdoor environments.",
        );
        break;
      case "chemical_splash":
        addCoating(
          "anti_fog",
          "Helps maintain visibility in chemical handling environments.",
        );
        addCoating(
          "extra_scratch_coating",
          "Protects lenses in harsh chemical environments where surface wear is accelerated.",
        );
        break;
      case "dust_debris":
        addCoating(
          "extra_scratch_coating",
          "Protects against surface wear from dust and debris exposure.",
        );
        break;
      case "high_impact":
        addCoating(
          "extra_scratch_coating",
          "Adds durability for high-impact environments where lenses take more punishment.",
        );
        break;
      case "temperature_extremes":
        addCoating(
          "anti_fog",
          "Prevents fogging during rapid temperature transitions.",
        );
        addCoating(
          "extra_scratch_coating",
          "Temperature stress accelerates lens wear — scratch coating extends lens life.",
        );
        break;
    }
  }

  // Industry-based recommendations (fill gaps not covered by exposures)
  switch (workType) {
    case "manufacturing":
      addCoating(
        "extra_scratch_coating",
        "Common in manufacturing environments to protect against accelerated lens wear.",
      );
      addCoating(
        "anti_fog",
        "Manufacturing floors often generate heat and humidity that cause fogging.",
      );
      break;
    case "construction":
      addCoating(
        "extra_scratch_coating",
        "Construction environments demand extra lens durability.",
      );
      addCoating(
        "transitions_sunglasses",
        "Outdoor construction work benefits from adaptive UV protection.",
      );
      break;
    case "warehouse":
      addCoating(
        "anti_fog",
        "Temperature changes between cold storage and dock areas cause frequent fogging.",
      );
      addCoating(
        "extra_scratch_coating",
        "Warehouse handling environments accelerate lens surface wear.",
      );
      break;
    case "healthcare":
      addCoating(
        "anti_reflective_anti_fog",
        "Clinical environments with masks and bright lighting benefit from both treatments.",
      );
      addCoating(
        "blue_light_anti_reflective",
        "Screen-heavy clinical workflows benefit from blue light protection.",
      );
      break;
    case "laboratory":
      addCoating(
        "anti_reflective_anti_fog",
        "Lab environments with ventilation and bright lighting benefit from dual treatment.",
      );
      addCoating(
        "anti_reflective",
        "Improves visual clarity for precision lab work.",
      );
      break;
    case "utilities":
      addCoating(
        "transitions_sunglasses",
        "Field utility workers alternating between indoor and outdoor benefit from adaptive lenses.",
      );
      addCoating(
        "anti_reflective",
        "Reduces glare during outdoor field service work.",
      );
      addCoating(
        "extra_scratch_coating",
        "Rugged field conditions accelerate lens wear.",
      );
      break;
    case "public_sector":
      addCoating(
        "blue_light_anti_reflective",
        "Public sector roles often involve extended screen work.",
      );
      addCoating(
        "anti_reflective",
        "Improves clarity for mixed indoor/outdoor municipal work.",
      );
      break;
    case "other":
      addCoating(
        "anti_reflective",
        "Anti-reflective coating provides universal glare reduction benefits.",
      );
      break;
  }

  return Array.from(results.values());
}

// ─── Main Recommendation Engine ──────────────────────────────────────────────

export function recommendProgram(
  rawInputs: RecommendProgramInputs,
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
    GROUP_A_BASE_EXPOSURES.has(risk),
  );
  const hasComplexExposures =
    !onlyGroupABaseExposures && exposureRisks.length > 0;
  const isMultiLocation = locationModel !== "single";
  const isNoFormalProgram = currentSafetySetup.includes("no_formal_program");
  const usesOnsiteOrHybrid = hasOnsiteOrHybrid(currentSafetySetup);

  let euPackage: EUPackage;
  let serviceTier: ServiceTier;

  // ──────────────────────────────────────────────────────────
  // STEP 1: EU PACKAGE — driven primarily by team size
  //
  //   1-30   → Compliance / Comfort
  //   31-100 → Comfort (approaching Complete)
  //   101+   → Complete
  //   500+   → Covered
  //
  // Industry and exposure modifiers escalate within this range.
  // ──────────────────────────────────────────────────────────

  if (coverageSizeBand === "500_plus") {
    euPackage = "Covered";
    rationale.push("EU: 500+ employees → Covered package.");
  } else if (coverageSizeBand === "251_500" || coverageSizeBand === "101_250") {
    euPackage = "Complete";
    rationale.push(
      `EU: ${coverageSizeBand === "251_500" ? "251-500" : "101-250"} employees → Complete package.`,
    );
  } else if (coverageSizeBand === "61_100") {
    euPackage = "Comfort";
    rationale.push(
      "EU: 61-100 employees → Comfort package (approaching Complete).",
    );
  } else if (coverageSizeBand === "31_60") {
    euPackage = "Comfort";
    rationale.push("EU: 31-60 employees → Comfort package.");
  } else {
    euPackage = "Compliance";
    rationale.push("EU: 1-30 employees → Compliance baseline.");
  }

  // Industry + exposure escalation
  if (inGroupB) {
    if (coverageSizeBand === "1_30") {
      euPackage = escalateEu(euPackage, "Comfort");
      rationale.push(
        "Industry escalation: Group B (healthcare/lab/utilities/public sector) → Comfort minimum.",
      );
    } else if (coverageSizeBand === "61_100") {
      euPackage = escalateEu(euPackage, "Complete");
      rationale.push("Industry escalation: Group B 61-100 → Complete.");
    }
  } else if (inGroupA && hasComplexExposures) {
    if (coverageSizeBand === "1_30") {
      euPackage = escalateEu(euPackage, "Comfort");
      rationale.push(
        "Exposure escalation: Complex exposures in Group A small team → Comfort.",
      );
    } else if (coverageSizeBand === "61_100") {
      euPackage = escalateEu(euPackage, "Complete");
      rationale.push(
        "Exposure escalation: Complex exposures in Group A 61-100 → Complete.",
      );
    }
  } else if (!inGroupA && !inGroupB && hasComplexExposures) {
    if (coverageSizeBand === "1_30") {
      euPackage = escalateEu(euPackage, "Comfort");
      rationale.push(
        "Exposure escalation: Complex exposures in specialized environment → Comfort.",
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 2: SERVICE TIER — driven by team size + locations
  //
  // Locations and setup are where service tier comes in:
  //   - 60+ employees → Premier minimum
  //   - Multi-site: NEVER Essential or Access
  //   - Multi across regions → almost always Enterprise
  // ──────────────────────────────────────────────────────────

  if (coverageSizeBand === "500_plus") {
    serviceTier = "Enterprise";
    rationale.push("Tier: 500+ employees → Enterprise.");
  } else if (
    coverageSizeBand === "251_500" ||
    coverageSizeBand === "101_250" ||
    coverageSizeBand === "61_100"
  ) {
    serviceTier = "Premier";
    rationale.push("Tier: 60+ employees → Premier minimum.");
  } else if (coverageSizeBand === "31_60") {
    serviceTier = "Access";
    rationale.push("Tier: 31-60 employees → Access.");
  } else {
    serviceTier = "Access";
    rationale.push("Tier: 1-30 employees → Access.");
  }

  // Location overrides — multi-site NEVER Essential or Access
  if (isMultiLocation) {
    serviceTier = escalateTier(serviceTier, "Premier");
    rationale.push(
      "Location override: Multi-site operations → at least Premier (never Essential/Access).",
    );

    // Multi across regions → almost always Enterprise
    if (locationModel === "multi_across_regions") {
      if (coverageSizeBand === "1_30") {
        serviceTier = escalateTier(serviceTier, "Premier");
        rationale.push("Location override: Cross-region small team → Premier.");
      } else {
        serviceTier = "Enterprise";
        rationale.push(
          "Location override: Cross-region operations → Enterprise.",
        );
      }
    }

    // Multi-site EU escalation
    euPackage = escalateEu(euPackage, "Complete");
    rationale.push("Location EU: Multi-site → at least Complete.");

    // Group B cross-region gets Covered
    if (inGroupB && locationModel === "multi_across_regions") {
      euPackage = escalateEu(euPackage, "Covered");
      rationale.push("Location EU: Group B cross-region → Covered.");
    }
  }

  // Service model overrides (onsite/hybrid → at least Premier)
  if (usesOnsiteOrHybrid) {
    serviceTier = escalateTier(serviceTier, "Premier");
    rationale.push("Service model: Onsite/Hybrid delivery → at least Premier.");
  }

  // No formal program special case — Essential ONLY for 1-30, single site
  if (
    isNoFormalProgram &&
    coverageSizeBand === "1_30" &&
    locationModel === "single" &&
    !budgetPreference
  ) {
    serviceTier = "Essential";
    euPackage = "Compliance";
    rationale.push(
      "Special case: No formal program + 1-30 + single site → Compliance + Essential.",
    );
  }

  // ──────────────────────────────────────────────────────────
  // STEP 3: Add-on inference
  // ──────────────────────────────────────────────────────────

  const inferredAddOns = exposureRisks
    .map((risk) => HAZARD_ADD_ON_MAP[risk])
    .filter((addOn): addOn is RecommendationAddOn => Boolean(addOn));
  const addOns = dedupeAddOns([...selectedAddOns, ...inferredAddOns]);

  if (inferredAddOns.length > 0) {
    rationale.push(
      `Inference: Hazards map to add-ons → ${dedupeAddOns(inferredAddOns).join(", ")}.`,
    );
  }

  // ──────────────────────────────────────────────────────────
  // STEP 4: Budget constraints — EU package only
  //
  // Service tier is driven by locations and team size,
  // not budget. Budget influences coverage depth (EU).
  // ──────────────────────────────────────────────────────────

  if (budgetPreference) {
    const constraints = budgetConstraint(budgetPreference, coverageSizeBand);
    const beforeEu = euPackage;
    euPackage = clampToAllowed(euPackage, EU_ORDER, constraints.allowedEu);
    if (beforeEu !== euPackage) {
      rationale.push(`Budget clamp (${constraints.label}) → EU ${euPackage}.`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: Safety nets
  // ──────────────────────────────────────────────────────────

  // Essential only valid for very small single-site teams
  if (serviceTier === "Essential" && coverageSizeBand !== "1_30") {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Essential only valid for 1-30 employees → Access.",
    );
  }

  // Multi-site hard floor — budget can never override this
  if (
    isMultiLocation &&
    (serviceTier === "Essential" || serviceTier === "Access")
  ) {
    serviceTier = "Premier";
    rationale.push("Safety net: Multi-site must be Premier or higher.");
  }

  // ──────────────────────────────────────────────────────────
  // STEP 6: Coating recommendations
  // ──────────────────────────────────────────────────────────

  const coatingRecommendations = recommendCoatings({
    workType,
    exposureRisks,
    locationModel,
    coverageSizeBand,
  });

  return {
    euPackage,
    serviceTier,
    addOns,
    rationale,
    recommendedEuPackage: euPackage,
    recommendedServiceTier: serviceTier,
    recommendedAddOns: addOns,
    coatingRecommendations,
  };
}
