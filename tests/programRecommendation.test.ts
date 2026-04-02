import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendProgram,
  type RecommendProgramInputs,
} from "../src/lib/recommendProgram.js";

function makeInputs(
  overrides: Partial<RecommendProgramInputs> = {},
): RecommendProgramInputs {
  return {
    workType: "manufacturing",
    coverageSizeBand: "51_100",
    locationModel: "single",
    exposureRisks: [],
    currentSafetySetup: [],
    budgetPreference: undefined,
    selectedAddOns: [],
    ...overrides,
  };
}

test("1) Minimal hazards, lower budget, lower-complexity industry -> Compliance", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "public_sector",
      coverageSizeBand: "1_50",
      exposureRisks: [],
      currentSafetySetup: ["no_formal_program"],
      budgetPreference: "super_strict",
    }),
  );

  assert.equal(result.euPackage, "Compliance");
  assert.equal(result.serviceTier, "Essential");
});

test("2) Hazardous profile with middle budget -> Comfort", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "51_100",
      exposureRisks: ["high_impact", "dust_debris"],
      budgetPreference: "good_budget",
    }),
  );

  assert.equal(result.euPackage, "Comfort");
  assert.equal(result.serviceTier, "Access");
});

test("3) Hazardous profile with higher budget in complex industry -> Complete", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "201_plus",
      exposureRisks: ["high_impact", "chemical_splash"],
      budgetPreference: "unlimited_budget",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("4) Moderate hazards with low budget stay in Compliance", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      exposureRisks: ["high_impact"],
      budgetPreference: "low_budget",
    }),
  );

  assert.equal(result.euPackage, "Compliance");
});

test("5) High hazards with low budget move to Comfort, not Complete", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "construction",
      exposureRisks: ["high_impact", "chemical_splash"],
      budgetPreference: "low_budget",
    }),
  );

  assert.equal(result.euPackage, "Comfort");
});

test("6) High hazards with good budget in standard industry can reach Complete", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      exposureRisks: ["high_impact", "chemical_splash"],
      budgetPreference: "good_budget",
    }),
  );

  assert.equal(result.euPackage, "Complete");
});

test("7) Manufacturing with fog and screen intensive hazards infers Anti fog and Blue light", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      exposureRisks: ["fog_humidity", "screen_intensive"],
    }),
  );

  assert.deepEqual(result.addOns, ["Anti fog", "Blue light"]);
});

test("8) Team size 101 to 200 maps to Access baseline", () => {
  const result = recommendProgram(
    makeInputs({
      coverageSizeBand: "101_200",
      locationModel: "single",
    }),
  );

  assert.equal(result.serviceTier, "Access");
});

test("9) Multi-location small teams start at Access", () => {
  const result = recommendProgram(
    makeInputs({
      coverageSizeBand: "1_50",
      locationModel: "multi_same_region",
      budgetPreference: "low_budget",
    }),
  );

  assert.equal(result.serviceTier, "Access");
});

test("9b) Multi-location can never remain Essential under strict budget", () => {
  const result = recommendProgram(
    makeInputs({
      coverageSizeBand: "1_50",
      locationModel: "multi_across_regions",
      budgetPreference: "super_strict",
      currentSafetySetup: ["no_formal_program"],
    }),
  );

  assert.equal(result.serviceTier, "Access");
});

test("10) Premier requires strong setup partnership signals plus scale and budget", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "construction",
      coverageSizeBand: "201_plus",
      locationModel: "multi_across_regions",
      currentSafetySetup: [
        "multiple_approval_process",
        "onsite_events",
        "prescription_safety_eyewear",
        "hybrid_model",
      ],
      budgetPreference: "good_budget",
    }),
  );

  assert.equal(result.serviceTier, "Premier");
});

test("11) Premier does not trigger for low-budget posture even with size", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "construction",
      coverageSizeBand: "201_plus",
      locationModel: "multi_across_regions",
      currentSafetySetup: [
        "multiple_approval_process",
        "onsite_events",
        "prescription_safety_eyewear",
      ],
      budgetPreference: "low_budget",
    }),
  );

  assert.equal(result.serviceTier, "Access");
});

test("12) Coatings include context signals for large self-service programs", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "warehouse",
      coverageSizeBand: "101_200",
      currentSafetySetup: ["employee_self_order"],
      exposureRisks: ["fog_humidity"],
    }),
  );

  assert.ok(
    result.coatingRecommendations.some(
      (coating) => coating.id === "extra_scratch_coating",
    ),
  );
});

test("13) Full investment budget alone does not force Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "201_plus",
      locationModel: "single",
      budgetPreference: "unlimited_budget",
    }),
  );

  assert.equal(result.serviceTier, "Access");
});
