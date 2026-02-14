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

export type DepartmentBreakdownPrintStateInput = {
  print: boolean;
  canShowDepartmentAllowanceBreakdown: boolean;
  canShowDepartmentAddOnsBreakdown: boolean;
  canShowDepartmentServiceBreakdown: boolean;
  showDepartmentAllowanceBreakdown: boolean;
  showDepartmentAddOnsBreakdown: boolean;
  showDepartmentServiceBreakdown: boolean;
};

export type DepartmentBreakdownPrintState = {
  showPrintDepartmentEuBreakdown: boolean;
  showPrintDepartmentAllowanceBreakdown: boolean;
  showPrintDepartmentAddOnsBreakdown: boolean;
  showPrintDepartmentServiceBreakdown: boolean;
  showPrintAddOnsServiceAlignmentMode: boolean;
};

export function resolveDepartmentBreakdownPrintState(
  input: DepartmentBreakdownPrintStateInput
): DepartmentBreakdownPrintState {
  const showPrintDepartmentEuBreakdown =
    input.print &&
    input.canShowDepartmentAllowanceBreakdown &&
    input.canShowDepartmentAddOnsBreakdown &&
    input.showDepartmentAllowanceBreakdown &&
    input.showDepartmentAddOnsBreakdown;

  const showPrintDepartmentAllowanceBreakdown =
    input.print &&
    input.canShowDepartmentAllowanceBreakdown &&
    input.showDepartmentAllowanceBreakdown &&
    !showPrintDepartmentEuBreakdown;

  const showPrintDepartmentAddOnsBreakdown =
    input.print &&
    input.canShowDepartmentAddOnsBreakdown &&
    input.showDepartmentAddOnsBreakdown &&
    !showPrintDepartmentEuBreakdown;

  const showPrintDepartmentServiceBreakdown =
    input.print &&
    input.canShowDepartmentServiceBreakdown &&
    input.showDepartmentServiceBreakdown;

  const showPrintAddOnsServiceAlignmentMode =
    input.print &&
    showPrintDepartmentAddOnsBreakdown &&
    !showPrintDepartmentAllowanceBreakdown &&
    showPrintDepartmentServiceBreakdown;

  return {
    showPrintDepartmentEuBreakdown,
    showPrintDepartmentAllowanceBreakdown,
    showPrintDepartmentAddOnsBreakdown,
    showPrintDepartmentServiceBreakdown,
    showPrintAddOnsServiceAlignmentMode,
  };
}
