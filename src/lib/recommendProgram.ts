export type EUPackage = "Compliance" | "Comfort" | "Complete";
export type ServiceTier = "Essential" | "Access" | "Premier";

export type ProgramWorkType =
  | "manufacturing"
  | "construction"
  | "utilities"
  | "warehouse"
  | "healthcare"
  | "public_sector"
  | "laboratory"
  | "other";

export type CoverageSizeBand = "1_50" | "51_200" | "201_plus";

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

const EU_ORDER: EUPackage[] = ["Compliance", "Comfort", "Complete"];

const TIER_ORDER: ServiceTier[] = [
  "Essential",
  "Access",
  "Premier",
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

const SERVICE_TIER_SIZE_TABLE: Array<{
  maxEmployees: number;
  tier: ServiceTier;
  label: string;
}> = [
  { maxEmployees: 50, tier: "Essential", label: "1–50 employees" },
  { maxEmployees: 200, tier: "Access", label: "51–200 employees" },
  { maxEmployees: Number.POSITIVE_INFINITY, tier: "Access", label: "201+ employees" },
];

const INDUSTRY_EU_BASELINE: Record<ProgramWorkType, EUPackage> = {
  manufacturing: "Comfort",
  construction: "Comfort",
  utilities: "Comfort",
  warehouse: "Comfort",
  healthcare: "Complete",
  public_sector: "Compliance",
  laboratory: "Complete",
  other: "Compliance",
};

const HAZARD_WEIGHTS: Record<ProgramExposureRisk, number> = {
  high_impact: 2,
  dust_debris: 1,
  chemical_splash: 2,
  outdoor_glare: 1,
  fog_humidity: 1,
  indoor_outdoor_shift: 1,
  screen_intensive: 1,
  temperature_extremes: 1,
};

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

function representativeEmployeesForBand(band: CoverageSizeBand): number {
  const map: Record<CoverageSizeBand, number> = {
    "1_50": 30,
    "51_200": 100,
    "201_plus": 250,
  };
  return map[band];
}

function partnerNeedScore(args: {
  employees: number;
  locationModel: ProgramLocationModel;
  exposureRisks: ProgramExposureRisk[];
  currentSafetySetup: CurrentSafetySetup[];
  workType: ProgramWorkType;
}): number {
  const uniqueRisks = Array.from(new Set(args.exposureRisks));
  const hazardScore = uniqueRisks.reduce(
    (sum, risk) => sum + (HAZARD_WEIGHTS[risk] ?? 0),
    0,
  );
  const hasCriticalHazards =
    uniqueRisks.includes("chemical_splash") ||
    (uniqueRisks.includes("high_impact") &&
      (uniqueRisks.includes("temperature_extremes") ||
        uniqueRisks.includes("dust_debris")));

  let score = 0;

  if (args.locationModel === "multi_across_regions") score += 2;
  else if (args.locationModel === "multi_same_region") score += 1;

  if (hasOnsiteOrHybrid(args.currentSafetySetup)) score += 1;
  if (args.currentSafetySetup.includes("no_formal_program")) score += 1;
  if (args.employees > 200) score += 1;
  if (hazardScore >= 4) score += 1;
  if (hasCriticalHazards) score += 1;

  if (
    args.workType === "healthcare" ||
    args.workType === "laboratory" ||
    args.workType === "utilities"
  ) {
    score += 1;
  }

  return score;
}

function recommendServiceTierFromTable(args: {
  coverageSizeBand: CoverageSizeBand;
  locationModel: ProgramLocationModel;
  exposureRisks: ProgramExposureRisk[];
  currentSafetySetup: CurrentSafetySetup[];
  workType: ProgramWorkType;
  budgetPreference?: ProgramBudgetPreference;
  rationale: string[];
}): ServiceTier {
  const employees = representativeEmployeesForBand(args.coverageSizeBand);
  const baseRow =
    SERVICE_TIER_SIZE_TABLE.find((row) => employees <= row.maxEmployees) ??
    SERVICE_TIER_SIZE_TABLE[SERVICE_TIER_SIZE_TABLE.length - 1];
  let serviceTier = baseRow.tier;
  args.rationale.push(`Tier table: ${baseRow.label} -> ${serviceTier}.`);

  // Premier is only recommended for 201+ employees AND a high-investment posture.
  // "Ready to Grow" and "Full Program Investment" signal the org wants OSSO to own the
  // program management. Other postures stay at Access regardless of size.
  if (
    args.coverageSizeBand === "201_plus" &&
    (args.budgetPreference === "good_budget" ||
      args.budgetPreference === "unlimited_budget")
  ) {
    serviceTier = "Premier";
    args.rationale.push(
      "Escalation: 201+ employees with Ready to Grow or Full Program Investment posture -> Premier.",
    );
  }

  return serviceTier;
}

function recommendEuPackageFromIndustryAndHazards(args: {
  workType: ProgramWorkType;
  exposureRisks: ProgramExposureRisk[];
  rationale: string[];
}): EUPackage {
  const uniqueRisks = Array.from(new Set(args.exposureRisks));
  const hazardScore = uniqueRisks.reduce(
    (sum, risk) => sum + (HAZARD_WEIGHTS[risk] ?? 0),
    0,
  );
  const baseline = INDUSTRY_EU_BASELINE[args.workType];

  const hasCriticalHazards =
    uniqueRisks.includes("chemical_splash") ||
    (uniqueRisks.includes("high_impact") &&
      (uniqueRisks.includes("temperature_extremes") ||
        uniqueRisks.includes("dust_debris")));

  let euPackage: EUPackage;

  if (hazardScore === 0) {
    euPackage = baseline;
    args.rationale.push(
      `EU table: No hazards selected -> ${euPackage} baseline.`,
    );
  } else if (hazardScore <= 2 && !hasCriticalHazards) {
    euPackage = baseline === "Complete" ? "Complete" : "Comfort";
    args.rationale.push(
      `EU table: Lower hazard score (${hazardScore}) -> ${euPackage}.`,
    );
  } else {
    euPackage = "Complete";
    args.rationale.push(
      `EU table: Elevated hazard complexity (${hazardScore}) -> Complete.`,
    );
  }

  if (hazardScore > 0) {
    euPackage = escalateEu(euPackage, baseline);
    if (euPackage !== baseline) {
      args.rationale.push(`EU floor: Industry baseline retained at ${euPackage}.`);
    } else {
      args.rationale.push(`EU baseline: Industry (${args.workType}) -> ${baseline}.`);
    }
  } else {
    args.rationale.push(
      `EU baseline: Industry (${args.workType}) noted; no-hazard fallback applied.`,
    );
  }

  return euPackage;
}

// ─── Budget constraint — affects EU package only ─────────────────────────────
// Service tier is driven by locations and team size, not budget.
// Budget influences the EU package level (coverage depth).
function budgetConstraint(
  budgetPreference: ProgramBudgetPreference,
  coverageSizeBand: CoverageSizeBand,
): { allowedEu: EUPackage[]; label: string } {
  const isLargeTeam = coverageSizeBand === "201_plus";

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
        label: "Operations Focused",
      };
    }
    return {
      allowedEu: ["Compliance", "Comfort", "Complete"],
      label: "Operations Focused",
    };
  }

  if (budgetPreference === "good_budget") {
    return {
      allowedEu: ["Comfort", "Complete"],
      label: "Ready to Grow",
    };
  }

  // unlimited_budget
  return {
    allowedEu: ["Complete"],
    label: "Full Program Investment",
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
  const coverageSizeBand = rawInputs.coverageSizeBand ?? "51_200";
  const locationModel = rawInputs.locationModel ?? "single";
  const exposureRisks = rawInputs.exposureRisks ?? [];
  const currentSafetySetup = rawInputs.currentSafetySetup ?? [];
  const budgetPreference = rawInputs.budgetPreference;
  const selectedAddOns = dedupeAddOns(rawInputs.selectedAddOns ?? []);

  const rationale: string[] = [];
  const isMultiLocation = locationModel !== "single";

  let euPackage: EUPackage;
  let serviceTier: ServiceTier;

  // STEP 1: EU package uses industry + hazards only.
  euPackage = recommendEuPackageFromIndustryAndHazards({
    workType,
    exposureRisks,
    rationale,
  });

  // STEP 2: Service tier uses company size + budget posture.
  serviceTier = recommendServiceTierFromTable({
    coverageSizeBand,
    locationModel,
    exposureRisks,
    currentSafetySetup,
    workType,
    budgetPreference,
    rationale,
  });

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
  // STEP 4: Budget posture is captured for handoff only.
  //
  // Per recommendation rules, budget does not override
  // industry + hazard package logic or size/partner tier logic.
  // ──────────────────────────────────────────────────────────

  if (budgetPreference) {
    const constraints = budgetConstraint(budgetPreference, coverageSizeBand);
    rationale.push(
      `Budget noted (${constraints.label}) for specialist review; recommendation unchanged.`,
    );
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: Safety nets
  // ──────────────────────────────────────────────────────────

  // Essential only valid for the smallest band.
  if (serviceTier === "Essential" && coverageSizeBand !== "1_50") {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Essential only valid for 1\u201350 employees -> Access.",
    );
  }

  // Premier is never recommended without the 201+ band, regardless of other signals.
  if (serviceTier === "Premier" && coverageSizeBand !== "201_plus") {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Premier requires 201+ employees -> Access.",
    );
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
