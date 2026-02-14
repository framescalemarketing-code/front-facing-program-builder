export function includeEuAddOnsInAllowance(selectedEU) {
    return selectedEU !== "Covered";
}
export function calculateCompanywideAllowance({ selectedEU, baseEUAllowance, euPackageAddOnsPerEmployee, employees, }) {
    const includeAddOns = includeEuAddOnsInAllowance(selectedEU);
    const addOnsInAllowance = includeAddOns ? euPackageAddOnsPerEmployee : 0;
    const allowancePerEmployee = baseEUAllowance + addOnsInAllowance;
    const allowanceTotal = allowancePerEmployee * Math.max(0, employees);
    return {
        includeAddOns,
        addOnsInAllowance,
        allowancePerEmployee,
        allowanceTotal,
    };
}
