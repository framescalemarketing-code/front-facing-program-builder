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
    coverageSizeBand: "31_60",
    locationModel: "single",
    exposureRisks: [],
    currentSafetySetup: [],
    budgetPreference: undefined,
    selectedAddOns: [],
    ...overrides,
  };
}

test("1) Manufacturing 1 to 30 with high impact and dust, no program, no service model, no budget", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "1_30",
      exposureRisks: ["high_impact", "dust_debris"],
      currentSafetySetup: ["no_formal_program"],
    }),
  );

  assert.equal(result.euPackage, "Compliance");
  assert.equal(result.serviceTier, "Essential");
});

test("2) Manufacturing 61 to 100 with high impact and dust -> Compliance and Access", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "61_100",
      exposureRisks: ["high_impact", "dust_debris"],
    }),
  );

  assert.equal(result.euPackage, "Compliance");
  assert.equal(result.serviceTier, "Access");
});

test("3) Manufacturing 251 to 500 with high impact and dust -> Comfort and Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "251_500",
      exposureRisks: ["high_impact", "dust_debris"],
    }),
  );

  assert.equal(result.euPackage, "Comfort");
  assert.equal(result.serviceTier, "Premier");
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

test("5) Healthcare 31 to 60 with no add-ons, 1 location -> Comfort and Access", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "31_60",
      locationModel: "single",
    }),
  );

  assert.equal(result.euPackage, "Comfort");
  assert.equal(result.serviceTier, "Access");
});

test("6) Healthcare with any selected add-on -> Comfort and Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "31_60",
      selectedAddOns: ["Blue light"],
    }),
  );

  assert.equal(result.euPackage, "Comfort");
  assert.equal(result.serviceTier, "Premier");
});

test("7) Healthcare with 2 locations in same region -> Covered and Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "31_60",
      locationModel: "multi_same_region",
    }),
  );

  assert.equal(result.euPackage, "Covered");
  assert.equal(result.serviceTier, "Premier");
});

test("8) Healthcare with 2 locations across regions -> Covered and Enterprise", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "31_60",
      locationModel: "multi_across_regions",
    }),
  );

  assert.equal(result.euPackage, "Covered");
  assert.equal(result.serviceTier, "Enterprise");
});

test("9) Onsite Events with 101 to 500 employees -> Tier Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "construction",
      coverageSizeBand: "101_250",
      currentSafetySetup: ["onsite_events"],
    }),
  );

  assert.equal(result.serviceTier, "Premier");
});

test("10) Lean Essentials clamps down scenario that would otherwise be Covered and Enterprise", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "healthcare",
      coverageSizeBand: "101_250",
      locationModel: "multi_across_regions",
      budgetPreference: "super_strict",
    }),
  );

  assert.ok(
    result.euPackage === "Compliance" || result.euPackage === "Comfort",
  );
  assert.equal(result.serviceTier, "Access");
});

test("11) Performance First posture upgrades small team to Complete and Premier", () => {
  const result = recommendProgram(
    makeInputs({
      workType: "manufacturing",
      coverageSizeBand: "1_30",
      exposureRisks: ["high_impact", "dust_debris"],
      budgetPreference: "unlimited_budget",
    }),
  );

  assert.equal(result.euPackage, "Complete");
  assert.equal(result.serviceTier, "Premier");
});
