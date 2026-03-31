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
    coverageSizeBand: "51_200",
    locationModel: "single",
    exposureRisks: [],
    currentSafetySetup: [],
    budgetPreference: undefined,
    selectedAddOns: [],
    ...overrides,
  };
}

test("1) Manufacturing 1 to 50 with high impact and dust, no program, no service model, no budget", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "1_50",
      exposureRisks: ["high_impact", "dust_debris"],
      currentSafetySetup: ["no_formal_program"],
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Essential");
});

test("2) Manufacturing 51 to 200 with high impact and dust -> Complete and Access", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "51_200",
      exposureRisks: ["high_impact", "dust_debris"],
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("3) Manufacturing 201+ with high impact and dust and operations budget -> Complete and Access", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "201_plus",
      exposureRisks: ["high_impact", "dust_debris"],
      budgetPreference: "low_budget",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("4) Manufacturing with fog and screen intensive hazards infers Anti fog and Blue light", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      exposureRisks: ["fog_humidity", "screen_intensive"],
    }),
  );

  assert.deepEqual(result.addOns, ["Anti fog", "Blue light"]);
});

test("5) Healthcare 51 to 200 with no add-ons, 1 location -> Complete and Access", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "51_200",
      locationModel: "single",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("6) Healthcare 51 to 200 with selected add-on -> Complete and Access (service tier is location/size driven)", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "51_200",
      selectedAddOns: ["Blue light"],
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("7) Healthcare with 2 locations in same region stays Access without growth/investment posture", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "51_200",
      locationModel: "multi_same_region",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("8) Healthcare with 2 locations across regions stays Access without growth/investment posture", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "51_200",
      locationModel: "multi_across_regions",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("9) Onsite Events with 201+ and Ready to Grow posture -> Tier Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "construction",
      coverageSizeBand: "201_plus",
      currentSafetySetup: ["onsite_events"],
      budgetPreference: "good_budget",
    }),
  );

  assert.equal(result.serviceTier, "Premier");
});

test("10) Compliance First budget on 201+ does not unlock Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "201_plus",
      locationModel: "multi_across_regions",
      budgetPreference: "super_strict",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Access");
});

test("11) Full Investment budget is captured; small high-hazard team stays Essential", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "1_50",
      exposureRisks: ["high_impact", "dust_debris"],
      budgetPreference: "unlimited_budget",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  // Service tier follows company-size table unless partner-takeover signals are high
  assert.equal(result.serviceTier, "Essential");
});
