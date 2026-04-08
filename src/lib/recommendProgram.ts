export type EUPackage = "Compliance" | "Comfort" | "Complete" | "Covered";
export type ServiceTier = "Essential" | "Access" | "Premier" | "Partnered";

export type ProgramWorkType =
  | "manufacturing"
  | "construction"
  | "utilities"
  | "warehouse"
  | "healthcare"
  | "public_sector"
  | "laboratory"
  | "other";

export type CoverageSizeBand = "1_50" | "51_100" | "101_200" | "201_plus";

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
  | "no_formal_approval_process"
  | "single_approval_process"
  | "multiple_approval_process"
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
  upgradeOptions: {
    euPackage?: "Covered";
    serviceTier?: "Partnered";
    rationale: string[];
  } | null;
  recommendedEuPackage: EUPackage;
  recommendedServiceTier: ServiceTier;
  recommendedAddOns: RecommendationAddOn[];
  coatingRecommendations: CoatingRecommendation[];
};

const SERVICE_TIER_SIZE_TABLE: Array<{
  maxEmployees: number;
  tier: ServiceTier;
  label: string;
}> = [
  { maxEmployees: 50, tier: "Essential", label: "1–50 employees" },
  { maxEmployees: 100, tier: "Access", label: "51–100 employees" },
  { maxEmployees: 200, tier: "Access", label: "101–200 employees" },
  { maxEmployees: Number.POSITIVE_INFINITY, tier: "Access", label: "201+ employees" },
];

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

const EU_PACKAGE_ORDER: EUPackage[] = ["Compliance", "Comfort", "Complete"];

function dedupeAddOns(addOns: RecommendationAddOn[]): RecommendationAddOn[] {
  const set = new Set(addOns);
  return ADD_ON_ORDER.filter((addOn) => set.has(addOn));
}

function representativeEmployeesForBand(band: CoverageSizeBand): number {
  const map: Record<CoverageSizeBand, number> = {
    "1_50": 30,
    "51_100": 75,
    "101_200": 150,
    "201_plus": 260,
  };
  return map[band];
}

function setupStructureScore(setup: CurrentSafetySetup[]): {
  minimalSignals: number;
  structuredSignals: number;
  partnershipSignals: number;
} {
  const minimal = new Set<CurrentSafetySetup>([
    "no_formal_program",
    "voucher",
    "reimbursement",
    "covered_through_vision_insurance",
    "employee_self_order",
    "mail_fulfillment",
    "otg_non_prescription_eyewear",
    "non_prescription_safety_eyewear",
    "no_formal_approval_process",
  ]);
  const structured = new Set<CurrentSafetySetup>([
    "single_approval_process",
    "onsite_events",
    "hybrid_model",
    "hybrid_delivery",
    "prescription_safety_eyewear",
    "vendor_optometry_partnership",
    "regional_service_centers",
    "hybrid_eyewear",
  ]);
  const partnership = new Set<CurrentSafetySetup>([
    "multiple_approval_process",
    "onsite_events",
    "hybrid_model",
    "hybrid_delivery",
    "prescription_safety_eyewear",
    "vendor_optometry_partnership",
  ]);

  let minimalSignals = 0;
  let structuredSignals = 0;
  let partnershipSignals = 0;

  for (const item of setup) {
    if (minimal.has(item)) minimalSignals += 1;
    if (structured.has(item)) structuredSignals += 1;
    if (partnership.has(item)) partnershipSignals += 1;
  }

  return { minimalSignals, structuredSignals, partnershipSignals };
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

  const isMultiLocation =
    args.locationModel === "multi_same_region" ||
    args.locationModel === "multi_across_regions";
  if (isMultiLocation && serviceTier === "Essential") {
    serviceTier = "Access";
    args.rationale.push("Tier baseline: Multi-location programs start at Access.");
  }

  const setupScore = setupStructureScore(args.currentSafetySetup);
  const hasStrongPartnershipSignals =
    setupScore.structuredSignals >= 3 && setupScore.partnershipSignals >= 2;
  const setupSkipped = args.currentSafetySetup.length === 0;

  if (
    args.budgetPreference === "super_strict" &&
    args.coverageSizeBand === "1_50" &&
    !isMultiLocation
  ) {
    serviceTier = "Essential";
    args.rationale.push("Budget goals: Compliance First keeps single-site small teams in Essential.");
  }

  if (
    args.budgetPreference === "low_budget" &&
    args.coverageSizeBand === "1_50" &&
    !isMultiLocation &&
    setupScore.minimalSignals >= setupScore.structuredSignals
  ) {
    serviceTier = "Essential";
    args.rationale.push("Budget goals: Operations Focused with minimal setup leans Essential.");
  }

  if (
    hasStrongPartnershipSignals &&
    (args.budgetPreference === "good_budget" ||
      args.budgetPreference === "unlimited_budget") &&
    (isMultiLocation || args.coverageSizeBand === "201_plus")
  ) {
    serviceTier = "Premier";
    args.rationale.push(
      "Tier escalation: structured partnership signals and scale indicate Premier support needs.",
    );
  }

  if (setupSkipped) {
    if (args.coverageSizeBand === "1_50" && !isMultiLocation) {
      serviceTier = "Essential";
    } else {
      serviceTier = "Access";
    }
    args.rationale.push(
      "Setup skipped: service tier held to lower-structure baseline.",
    );
  }

  return serviceTier;
}

function recommendEuPackageFromIndustryAndHazards(args: {
  workType: ProgramWorkType;
  exposureRisks: ProgramExposureRisk[];
  budgetPreference?: ProgramBudgetPreference;
  rationale: string[];
}): EUPackage {
  const uniqueRisks = Array.from(new Set(args.exposureRisks));
  const hazardScore = uniqueRisks.reduce(
    (sum, risk) => sum + (HAZARD_WEIGHTS[risk] ?? 0),
    0,
  );
  const budgetSupportsUpgrade =
    args.budgetPreference === "good_budget" ||
    args.budgetPreference === "unlimited_budget";
  const isHighComplexityIndustry =
    args.workType === "healthcare" || args.workType === "laboratory";
  const hasChemicalAndImpact =
    uniqueRisks.includes("chemical_splash") &&
    uniqueRisks.includes("high_impact");
  const costConstrained =
    args.budgetPreference === "super_strict" ||
    args.budgetPreference === "low_budget";

  // Compliance baseline: minimal hazard profiles stay in Compliance.
  if (hazardScore <= 1) {
    args.rationale.push(
      `EU package: minimal hazard profile (${hazardScore}) -> Compliance baseline.`,
    );
    return "Compliance";
  }

  // Compliance remains common for moderate hazard programs with cost-constrained posture.
  if (hazardScore <= 3 && costConstrained) {
    args.rationale.push(
      `EU package: moderate hazard profile (${hazardScore}) with cost-constrained goals -> Compliance.`,
    );
    return "Compliance";
  }

  // Complete remains rare: requires high hazards and upgrade-supporting budget.
  if (
    hazardScore >= 4 &&
    budgetSupportsUpgrade &&
    (isHighComplexityIndustry || hasChemicalAndImpact || hazardScore >= 6)
  ) {
    args.rationale.push(
      `EU package: elevated risk profile (${hazardScore}) with upgrade-supporting budget -> Complete.`,
    );
    return "Complete";
  }

  args.rationale.push(
    `EU package: intermediate risk profile (${hazardScore}) -> Comfort (budget ${args.budgetPreference ?? "not specified"}).`,
  );
  return "Comfort";
}

// ─── Budget constraint — affects EU package only ─────────────────────────────
// Service tier is driven by locations and team size, not budget.
// Budget influences the EU package level (coverage depth).
function budgetConstraint(
  budgetPreference: ProgramBudgetPreference,
): { allowedEu: EUPackage[]; label: string } {
  if (budgetPreference === "super_strict") {
    return {
      allowedEu: ["Compliance", "Comfort"],
      label: "Lean Budget",
    };
  }

  if (budgetPreference === "low_budget") {
    return {
      allowedEu: ["Compliance", "Comfort"],
      label: "Lean Budget",
    };
  }

  if (budgetPreference === "good_budget") {
    return {
      allowedEu: ["Compliance", "Comfort", "Complete"],
      label: "Balanced Budget",
    };
  }

  // unlimited_budget
  return {
    allowedEu: ["Compliance", "Comfort", "Complete"],
    label: "Growth Budget",
  };
}

function clampEuPackage(
  euPackage: EUPackage,
  allowedEu: EUPackage[],
): EUPackage {
  if (allowedEu.includes(euPackage)) {
    return euPackage;
  }

  const selectedRank = EU_PACKAGE_ORDER.indexOf(euPackage);
  const rankedAllowed = allowedEu
    .map((pkg) => ({ pkg, rank: EU_PACKAGE_ORDER.indexOf(pkg) }))
    .sort((a, b) => a.rank - b.rank);

  const nearest =
    rankedAllowed.find((candidate) => candidate.rank >= selectedRank) ??
    rankedAllowed[rankedAllowed.length - 1];

  return nearest.pkg;
}

function determineUpgradeOptions(args: {
  euPackage: EUPackage;
  serviceTier: ServiceTier;
  coverageSizeBand: CoverageSizeBand;
  locationModel: ProgramLocationModel;
  exposureRisks: ProgramExposureRisk[];
  currentSafetySetup: CurrentSafetySetup[];
  budgetPreference?: ProgramBudgetPreference;
}): RecommendProgramResult["upgradeOptions"] {
  const rationale: string[] = [];
  const uniqueRisks = Array.from(new Set(args.exposureRisks));
  const hasFourPlusHazards = uniqueRisks.length >= 4;
  const hasLargerInvestmentBudget = args.budgetPreference === "unlimited_budget";
  const hasLargeTeam = args.coverageSizeBand === "201_plus";
  const hazardScore = uniqueRisks.reduce(
    (sum, risk) => sum + (HAZARD_WEIGHTS[risk] ?? 0),
    0,
  );
  const hasChemicalAndImpact =
    uniqueRisks.includes("chemical_splash") &&
    uniqueRisks.includes("high_impact");
  const isScaledProgram =
    args.coverageSizeBand === "201_plus" ||
    args.locationModel === "multi_across_regions";
  const setupScore = setupStructureScore(args.currentSafetySetup);
  const budgetSupportsUpgrade =
    args.budgetPreference === "good_budget" ||
    args.budgetPreference === "unlimited_budget";

  let euPackage: "Covered" | undefined;
  let serviceTier: "Partnered" | undefined;

  if (hasFourPlusHazards) {
    euPackage = "Covered";
    rationale.push(
      "Covered signal: 4+ hazards selected. Ask about customizable allowance, lens options, and frame options.",
    );
  }

  if (hasLargeTeam && hasLargerInvestmentBudget) {
    serviceTier = "Partnered";
    rationale.push(
      "Partnership service signal: 200+ employees with larger investment budget. Ask about a customizable service tier setup.",
    );
  }

  if (
    args.euPackage === "Complete" &&
    isScaledProgram &&
    budgetSupportsUpgrade &&
    (hazardScore >= 5 || hasChemicalAndImpact)
  ) {
    euPackage = "Covered";
    rationale.push(
      "Covered is available when Complete-level coverage is already in place and risk + scale signals show need for deeper governance.",
    );
  }

  if (
    args.serviceTier === "Premier" &&
    args.locationModel === "multi_across_regions" &&
    args.coverageSizeBand === "201_plus" &&
    setupScore.partnershipSignals >= 3 &&
    setupScore.structuredSignals >= 3 &&
    budgetSupportsUpgrade
  ) {
    serviceTier = "Partnered";
    rationale.push(
      "Partnered is available for enterprise-scale, multi-region programs with mature approval and delivery structure.",
    );
  }

  if (!euPackage && !serviceTier) {
    return null;
  }

  return {
    euPackage,
    serviceTier,
    rationale,
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
  currentSafetySetup: CurrentSafetySetup[];
}): CoatingRecommendation[] {
  const {
    workType,
    exposureRisks,
    locationModel,
    coverageSizeBand,
    currentSafetySetup,
  } = inputs;
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
          "Recommended for high screen usage to reduce eye strain over long shifts.",
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
      addCoating("anti_reflective", "Clinical settings benefit from reduced glare and clearer visibility.");
      addCoating("anti_fog", "Clinical environments with frequent mask use benefit from anti-fog support.");
      addCoating("blue_light_filter", "Screen-heavy clinical workflows benefit from blue light support.");
      break;
    case "laboratory":
      addCoating("anti_fog", "Lab environments with ventilation and humidity changes benefit from anti-fog support.");
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
        "blue_light_filter",
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

  const largeTeam = coverageSizeBand === "101_200" || coverageSizeBand === "201_plus";
  const distributedProgram =
    locationModel === "multi_same_region" || locationModel === "multi_across_regions";
  const hasSelfServiceOrdering =
    currentSafetySetup.includes("employee_self_order") ||
    currentSafetySetup.includes("mail_fulfillment");
  const hasStructuredFitting =
    currentSafetySetup.includes("onsite_events") ||
    currentSafetySetup.includes("hybrid_delivery") ||
    currentSafetySetup.includes("hybrid_model");

  if (largeTeam && hasSelfServiceOrdering) {
    addCoating(
      "extra_scratch_coating",
      "Higher-order volume programs with self-service ordering usually benefit from added lens durability.",
    );
  }

  if (distributedProgram && hasStructuredFitting) {
    addCoating(
      "anti_reflective",
      "Multi-location programs with mixed fitting pathways benefit from consistent visual clarity options.",
    );
  }

  return Array.from(results.values());
}

// ─── Main Recommendation Engine ──────────────────────────────────────────────

export function recommendProgram(
  rawInputs: RecommendProgramInputs,
): RecommendProgramResult {
  const workType = rawInputs.workType ?? "manufacturing";
  const coverageSizeBand = rawInputs.coverageSizeBand ?? "51_100";
  const locationModel = rawInputs.locationModel ?? "single";
  const exposureRisks = rawInputs.exposureRisks ?? [];
  const currentSafetySetup = rawInputs.currentSafetySetup ?? [];
  const budgetPreference = rawInputs.budgetPreference;
  const selectedAddOns = dedupeAddOns(rawInputs.selectedAddOns ?? []);
  const setupSkipped = currentSafetySetup.length === 0;

  const rationale: string[] = [];

  let euPackage: EUPackage;
  let serviceTier: ServiceTier;

  // STEP 1: EU package uses industry + hazards only.
  euPackage = recommendEuPackageFromIndustryAndHazards({
    workType,
    exposureRisks,
    budgetPreference,
    rationale,
  });

  if (setupSkipped) {
    const loweredEu = clampEuPackage(euPackage, ["Compliance", "Comfort"]);
    if (loweredEu !== euPackage) {
      rationale.push(
        `Setup skipped: EU package adjusted from ${euPackage} to ${loweredEu}.`,
      );
      euPackage = loweredEu;
    } else {
      rationale.push("Setup skipped: EU package held to baseline depth.");
    }
  }

  // STEP 2: Service tier uses team size + locations + setup + budget goals.
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
  // STEP 4: Budget goals are part of package/tier selection and also documented.
  if (budgetPreference) {
    const constraints = budgetConstraint(budgetPreference);
    rationale.push(`Budget goals applied: ${constraints.label}.`);
    const constrainedEuPackage = clampEuPackage(euPackage, constraints.allowedEu);
    if (constrainedEuPackage !== euPackage) {
      rationale.push(
        `Budget goals constrained EU package from ${euPackage} to ${constrainedEuPackage}.`,
      );
      euPackage = constrainedEuPackage;
    }
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

  if (serviceTier === "Essential" && locationModel !== "single") {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Multi-site programs can never remain Essential -> Access.",
    );
  }

  // Premier should remain rare and require either large single-site scale
  // or a qualified multi-location structure.
  if (
    serviceTier === "Premier" &&
    coverageSizeBand !== "201_plus" &&
    locationModel === "single"
  ) {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Premier requires either 201+ single-site scale or qualified multi-location complexity -> Access.",
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
    currentSafetySetup,
  });

  const upgradeOptions = determineUpgradeOptions({
    euPackage,
    serviceTier,
    coverageSizeBand,
    locationModel,
    exposureRisks,
    currentSafetySetup,
    budgetPreference,
  });

  if (upgradeOptions?.euPackage || upgradeOptions?.serviceTier) {
    rationale.push(
      "Upgrade path available: Covered package and/or Partnered service may be reviewed with your specialist if enterprise governance needs are confirmed.",
    );
  }

  return {
    euPackage,
    serviceTier,
    addOns,
    rationale,
    upgradeOptions,
    recommendedEuPackage: euPackage,
    recommendedServiceTier: serviceTier,
    recommendedAddOns: addOns,
    coatingRecommendations,
  };
}
