import assert from "node:assert/strict";
import test from "node:test";
import { departmentAllowanceSummaryValues, departmentInvoicePerEmployeeValues, hasDepartmentAddOnsBreakdown, PRINT_KEEP_TOGETHER_CLASSES, } from "../src/lib/quotePreviewRules.js";
const rows = [
    { allowancePerEmployee: 965, employeeCount: 30, selectedAddOnsLabels: ["Anti-Fog"] },
    { allowancePerEmployee: 235, employeeCount: 100, selectedAddOnsLabels: [] },
];
test("detects when department add-ons breakdown should be available", () => {
    assert.equal(hasDepartmentAddOnsBreakdown(rows), true);
    assert.equal(hasDepartmentAddOnsBreakdown([{ allowancePerEmployee: 235, employeeCount: 20, selectedAddOnsLabels: [] }]), false);
});
test("builds allowance summary values in department order", () => {
    assert.deepEqual(departmentAllowanceSummaryValues(rows), [965, 235]);
});
test("builds invoice-per-employee summary values using service component", () => {
    assert.deepEqual(departmentInvoicePerEmployeeValues(rows, 85), [1050, 320]);
});
test("exposes stable print keep-together class names", () => {
    assert.equal(PRINT_KEEP_TOGETHER_CLASSES.locationItem, "print-location-item");
    assert.equal(PRINT_KEEP_TOGETHER_CLASSES.locationSummary, "print-location-summary");
    assert.equal(PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock, "print-breakdown-block");
});
