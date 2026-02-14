export type DepartmentAllowanceLike = {
  allowancePerEmployee: number;
  employeeCount: number;
  selectedAddOnsLabels: string[];
};

export const PRINT_KEEP_TOGETHER_CLASSES = {
  locationItem: "print-location-item",
  locationSummary: "print-location-summary",
  breakdownBlock: "print-breakdown-block",
  sectionHeader: "print-section-header",
  sectionLead: "print-section-lead",
} as const;

export function hasDepartmentAddOnsBreakdown(rows: DepartmentAllowanceLike[]) {
  return rows.some((row) => row.selectedAddOnsLabels.length > 0);
}

export function departmentAllowanceSummaryValues(rows: DepartmentAllowanceLike[]) {
  return rows.map((row) => row.allowancePerEmployee);
}

export function departmentInvoicePerEmployeeValues(rows: DepartmentAllowanceLike[], servicePerEmployee: number) {
  return rows.map((row) => row.allowancePerEmployee + servicePerEmployee);
}
