export function includeEuAddOnsInAllowance() {
    return true;
}
export function calculateCompanywideAllowance({ baseEUAllowance, euPackageAddOnsPerEmployee, employees, }) {
    const includeAddOns = includeEuAddOnsInAllowance();
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
