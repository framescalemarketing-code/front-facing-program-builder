import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompanywideAllowance } from "../src/lib/allowanceMath.js";
test("Complete package with zero add ons uses base allowance only", () => {
    const result = calculateCompanywideAllowance({
        baseEUAllowance: 435,
        euPackageAddOnsPerEmployee: 0,
        employees: 12,
    });
    assert.equal(result.includeAddOns, true);
    assert.equal(result.allowancePerEmployee, 435);
    assert.equal(result.allowanceTotal, 5220);
});
test("Complete package with multiple add ons includes add ons in allowance", () => {
    const result = calculateCompanywideAllowance({
        baseEUAllowance: 435,
        euPackageAddOnsPerEmployee: 185,
        employees: 10,
    });
    assert.equal(result.includeAddOns, true);
    assert.equal(result.addOnsInAllowance, 185);
    assert.equal(result.allowancePerEmployee, 620);
    assert.equal(result.allowanceTotal, 6200);
});
test("Non-Complete package with add ons includes add ons as control case", () => {
    const result = calculateCompanywideAllowance({
        baseEUAllowance: 290,
        euPackageAddOnsPerEmployee: 90,
        employees: 4,
    });
    assert.equal(result.includeAddOns, true);
    assert.equal(result.allowancePerEmployee, 380);
    assert.equal(result.allowanceTotal, 1520);
});
