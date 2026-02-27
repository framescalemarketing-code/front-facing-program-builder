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

function serviceTierForGroupABase(
  coverageSizeBand: CoverageSizeBand,
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
  coverageSizeBand: CoverageSizeBand,
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
  budgetPreference: ProgramBudgetPreference,
  coverageSizeBand: CoverageSizeBand,
): { allowedEu: EUPackage[]; allowedTier: ServiceTier[]; label: string } {
  const isLargeTeam =
    coverageSizeBand === "101_250" ||
    coverageSizeBand === "251_500" ||
    coverageSizeBand === "500_plus";
  const isMidTeam = coverageSizeBand === "61_100";

  if (budgetPreference === "super_strict") {
    // Even compliance-first programs need Access or better for 100+ employees
    if (isLargeTeam) {
      return {
        allowedEu: ["Compliance", "Comfort"],
        allowedTier: ["Access", "Premier"],
        label: "Lean Essentials",
      };
    }
    if (isMidTeam) {
      return {
        allowedEu: ["Compliance", "Comfort"],
        allowedTier: ["Access"],
        label: "Lean Essentials",
      };
    }
    return {
      allowedEu: ["Compliance", "Comfort"],
      allowedTier: ["Access"],
      label: "Lean Essentials",
    };
  }

  if (budgetPreference === "low_budget") {
    if (isLargeTeam) {
      return {
        allowedEu: ["Comfort", "Complete"],
        allowedTier: ["Access", "Premier"],
        label: "Cost Smart Growth",
      };
    }
    return {
      allowedEu: ["Comfort"],
      allowedTier: ["Access"],
      label: "Cost Smart Growth",
    };
  }

  if (budgetPreference === "good_budget") {
    return {
      allowedEu: ["Comfort", "Complete", "Covered"],
      allowedTier: ["Access", "Premier", "Enterprise"],
      label: "Balanced",
    };
  }

  // unlimited_budget
  return {
    allowedEu: ["Complete", "Covered"],
    allowedTier: ["Premier", "Enterprise"],
    label: "Performance First",
  };
}

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
  const isMultiLocation = locationModel !== "single";
  const isNoFormalProgram = currentSafetySetup.includes("no_formal_program");
  const usesOnsiteOrHybrid = hasOnsiteOrHybrid(currentSafetySetup);

  let euPackage: EUPackage = "Compliance";
  let serviceTier: ServiceTier = "Access";
  let euFromExplicitRule = false;
  let tierFromExplicitRule = false;

  // ──────────────────────────────────────────────────────────
  // REFINED RECOMMENDATION MATRIX
  //
  // PRIMARY DRIVERS: team size + budget posture
  // SECONDARY DRIVERS: industry, location model, exposures
  //
  // Hard floor: Essential tier only for 1-30 employees with
  // no formal program AND no budget signal. Everyone else
  // starts at Access minimum.
  //
  // Industry-aware EU minimums:
  //   Group B (healthcare, lab, utilities, public_sector)
  //     → minimum Comfort for any size
  //     → Complete for 101+
  //     → Covered for multi-site
  //
  //   Group A (manufacturing, construction, warehouse)
  //     → Compliance fine for small teams with basic exposures
  //     → Comfort for 101+ or non-basic exposures
  //     → Complete for 251+
  // ──────────────────────────────────────────────────────────

  // 1) Base recommendation from team size + industry
  if (inGroupA && onlyGroupABaseExposures) {
    // Group A with only standard impact/dust exposures
    if (coverageSizeBand === "251_500" || coverageSizeBand === "500_plus") {
      euPackage = "Comfort";
      serviceTier = "Premier";
      rationale.push("Base: Group A 250+ employees → Comfort + Premier.");
    } else if (coverageSizeBand === "101_250") {
      euPackage = "Comfort";
      serviceTier = "Access";
      rationale.push("Base: Group A 101-250 employees → Comfort + Access.");
    } else if (coverageSizeBand === "61_100") {
      euPackage = "Compliance";
      serviceTier = "Access";
      rationale.push("Base: Group A 61-100 employees → Compliance + Access.");
    } else {
      euPackage = "Compliance";
      serviceTier = "Access";
      rationale.push(
        "Base: Group A small team with standard exposures → Compliance + Access.",
      );
    }
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
  } else if (inGroupA && !onlyGroupABaseExposures) {
    // Group A with comfort-signal or complex exposures → upgrade EU
    if (coverageSizeBand === "251_500" || coverageSizeBand === "500_plus") {
      euPackage = "Complete";
      serviceTier = "Premier";
      rationale.push(
        "Base: Group A 250+ with complex exposures → Complete + Premier.",
      );
    } else if (coverageSizeBand === "101_250") {
      euPackage = "Comfort";
      serviceTier = "Access";
      rationale.push(
        "Base: Group A 101-250 with complex exposures → Comfort + Access.",
      );
    } else {
      euPackage = "Comfort";
      serviceTier = "Access";
      rationale.push(
        "Base: Group A with complex exposures → Comfort + Access.",
      );
    }
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
  } else if (inGroupB) {
    // Group B always starts at Comfort minimum
    if (coverageSizeBand === "251_500" || coverageSizeBand === "500_plus") {
      euPackage = "Complete";
      serviceTier = "Premier";
      rationale.push("Base: Group B 250+ → Complete + Premier.");
    } else if (coverageSizeBand === "101_250") {
      euPackage = "Complete";
      serviceTier = "Access";
      rationale.push("Base: Group B 101-250 → Complete + Access.");
    } else {
      euPackage = "Comfort";
      serviceTier = "Access";
      rationale.push("Base: Group B starts at Comfort + Access.");
    }
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
  } else {
    // Other/specialized — default to Comfort + Access as baseline
    euPackage = "Comfort";
    serviceTier = "Access";
    rationale.push(
      "Base: Specialized environment → Comfort + Access baseline.",
    );
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
  }

  // 2) Location-based escalations
  if (isMultiLocation) {
    euPackage = escalateEu(euPackage, "Complete");
    rationale.push("Escalation: Multi-site → EU at least Complete.");

    if (locationModel === "multi_same_region") {
      serviceTier = escalateTier(serviceTier, "Premier");
      rationale.push(
        "Escalation: Same-region multi-site → Tier at least Premier.",
      );
    }

    if (locationModel === "multi_across_regions") {
      serviceTier = escalateTier(serviceTier, "Premier");
      euPackage = escalateEu(euPackage, "Covered");
      rationale.push(
        "Escalation: Cross-region multi-site → Covered + at least Premier.",
      );

      // Enterprise tier for cross-region AND large teams
      if (
        coverageSizeBand === "251_500" ||
        coverageSizeBand === "500_plus"
      ) {
        serviceTier = escalateTier(serviceTier, "Enterprise");
        rationale.push("Escalation: Cross-region 250+ → Enterprise tier.");
      }
    }

    euFromExplicitRule = true;
    tierFromExplicitRule = true;
  }

  // 3) Service model overrides
  if (usesOnsiteOrHybrid) {
    serviceTier = serviceTierForServiceModelOverride(coverageSizeBand);
    tierFromExplicitRule = true;
    rationale.push(
      "Override: Onsite/Hybrid selected → tier by employee bucket.",
    );
  }

  // 4) No formal program special case — Essential ONLY for very small teams
  if (
    isNoFormalProgram &&
    coverageSizeBand === "1_30" &&
    locationModel === "single" &&
    !budgetPreference
  ) {
    euPackage = "Compliance";
    serviceTier = "Essential";
    euFromExplicitRule = true;
    tierFromExplicitRule = true;
    rationale.push(
      "Special case: No formal program + 1-30 + single site + no budget signal → Compliance + Essential.",
    );
  }

  // 5) Team size floor — NEVER Essential for 61+ employees
  if (
    (coverageSizeBand === "61_100" ||
      coverageSizeBand === "101_250" ||
      coverageSizeBand === "251_500" ||
      coverageSizeBand === "500_plus") &&
    serviceTier === "Essential"
  ) {
    serviceTier = "Access";
    rationale.push(
      "Floor: 61+ employees cannot be on Essential tier → Access.",
    );
  }

  // Even stricter: 100+ should always have Comfort EU minimum
  if (
    coverageSizeBand === "101_250" ||
    coverageSizeBand === "251_500" ||
    coverageSizeBand === "500_plus"
  ) {
    euPackage = escalateEu(euPackage, "Comfort");
    rationale.push("Floor: 100+ employees → EU at least Comfort.");
  }

  // 6) Add-on inference and add-on based escalation
  const inferredAddOns = inGroupA
    ? dedupeAddOns(
        exposureRisks
          .map((risk) => HAZARD_ADD_ON_MAP[risk])
          .filter((addOn): addOn is RecommendationAddOn => Boolean(addOn)),
      )
    : [];
  const addOns = dedupeAddOns([...selectedAddOns, ...inferredAddOns]);

  if (inferredAddOns.length > 0) {
    rationale.push(
      `Inference: Hazards map to add-ons → ${inferredAddOns.join(", ")}.`,
    );
  }

  if (inGroupB && selectedAddOns.length >= 1) {
    serviceTier = escalateTier(serviceTier, "Premier");
    tierFromExplicitRule = true;
    rationale.push(
      "Escalation: Group B with selected add-on(s) → Tier at least Premier.",
    );
  }

  // 7) Customer profile tie breaker (only for axes not yet resolved)
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
    rationale.push(`Tie breaker (${profile}) → EU ${euPackage}.`);
  }

  if (!tierFromExplicitRule) {
    serviceTier = tieTarget.serviceTier;
    rationale.push(`Tie breaker (${profile}) → Tier ${serviceTier}.`);
  }

  // 8) Budget hard constraints and clamping
  if (budgetPreference) {
    const constraints = budgetConstraint(budgetPreference, coverageSizeBand);
    const beforeEu = euPackage;
    const beforeTier = serviceTier;

    euPackage = clampToAllowed(euPackage, EU_ORDER, constraints.allowedEu);
    serviceTier = clampToAllowed(
      serviceTier,
      TIER_ORDER,
      constraints.allowedTier,
    );

    if (beforeEu !== euPackage || beforeTier !== serviceTier) {
      rationale.push(
        `Budget clamp (${constraints.label}) → ${euPackage} + ${serviceTier}.`,
      );
    }
  }

  // 9) Final safety net — Essential should only appear for very small teams
  if (serviceTier === "Essential" && coverageSizeBand !== "1_30") {
    serviceTier = "Access";
    rationale.push(
      "Safety net: Essential only valid for 1-30 employees → Access.",
    );
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
