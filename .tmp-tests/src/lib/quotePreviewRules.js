export const PRINT_KEEP_TOGETHER_CLASSES = {
    locationItem: "print-location-item",
    locationSummary: "print-location-summary",
    breakdownBlock: "print-breakdown-block",
    sectionHeader: "print-section-header",
    sectionLead: "print-section-lead",
};
export function hasDepartmentAddOnsBreakdown(rows) {
    return rows.some((row) => row.selectedAddOnsLabels.length > 0);
}
export function departmentAllowanceSummaryValues(rows) {
    return rows.map((row) => row.allowancePerEmployee);
}
export function departmentInvoicePerEmployeeValues(rows, servicePerEmployee) {
    return rows.map((row) => row.allowancePerEmployee + servicePerEmployee);
}
