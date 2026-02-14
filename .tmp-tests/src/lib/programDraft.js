const emptyEuPackageAddOns = () => ({
    polarized: false,
    antiFog: false,
    antiReflectiveStd: false,
    blueLightAntiReflective: false,
    tint: false,
    transitions: false,
    transitionsPolarized: false,
    extraScratchCoating: false,
});
export const makeDefaultLocations = () => [
    {
        label: "Location 1",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        oneWayMiles: 0,
        oneWayMinutes: 0,
        autoDistance: true,
        status: "idle",
        statusMessage: "",
    },
];
const makeDefaultAddOns = () => ({
    euPackageAddOns: emptyEuPackageAddOns(),
    nonPrescriptionCustomSafetyGlasses: false,
    extraSiteVisits: 0,
});
const makeDefaultGuidelines = () => ({
    sideShieldType: "permanent",
    eligibilityFrequency: "annual",
    coverageType: "prescription_only",
    allowanceScope: "companywide",
    approvalWorkflowEnabled: false,
    restrictions: {
        restrictSunglassOptions: false,
        restrictUvReactivePhotochromicLenses: false,
    },
    notes: "",
});
const makeDefaultContact = () => ({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
});
export function createDefaultDraft() {
    return {
        builder: {
            guidelines: makeDefaultGuidelines(),
        },
        calculator: {
            eligibleEmployees: 1,
            selectedEU: "",
            selectedTier: "",
            paymentTerms: "NET30",
            paymentDiscount: "none",
            addOns: makeDefaultAddOns(),
            departmentAllowances: [],
            departmentConfigs: [],
            locations: makeDefaultLocations(),
            contact: makeDefaultContact(),
        },
    };
}
export const defaultDraft = createDefaultDraft();
export const makeDepartmentSelections = () => ({
    euPackageAddOns: emptyEuPackageAddOns(),
});
export function makeDepartmentConfigRow() {
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random()}`;
    return {
        id,
        name: "",
        employeeCount: 0,
        selections: makeDepartmentSelections(),
    };
}
export function ensureDepartmentConfigs(rows, minCount = 2) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalized = safeRows.map((row, idx) => {
        const id = row.id || `${Date.now()}_${idx}_${Math.random()}`;
        return {
            id,
            name: row.name ?? "",
            employeeCount: Number.isFinite(row.employeeCount) ? row.employeeCount : 0,
            selections: {
                euPackageAddOns: { ...emptyEuPackageAddOns(), ...(row.selections?.euPackageAddOns ?? {}) },
            },
        };
    });
    const toAdd = Math.max(0, minCount - normalized.length);
    if (toAdd > 0) {
        for (let i = 0; i < toAdd; i += 1) {
            normalized.push(makeDepartmentConfigRow());
        }
    }
    return normalized;
}
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function clampNonNegativeNumber(value, fallback = 0) {
    if (typeof value !== "number" || !Number.isFinite(value))
        return fallback;
    return Math.max(0, value);
}
function normalizeLocationRow(row, index) {
    const fallback = makeDefaultLocations()[0];
    return {
        label: typeof row?.label === "string" && row.label.trim() ? row.label : `Location ${index + 1}`,
        streetAddress: typeof row?.streetAddress === "string" ? row.streetAddress : fallback.streetAddress,
        city: typeof row?.city === "string" ? row.city : fallback.city,
        state: typeof row?.state === "string" ? row.state : fallback.state,
        zipCode: typeof row?.zipCode === "string" ? row.zipCode : fallback.zipCode,
        oneWayMiles: clampNonNegativeNumber(row?.oneWayMiles, fallback.oneWayMiles),
        oneWayMinutes: clampNonNegativeNumber(row?.oneWayMinutes, fallback.oneWayMinutes),
        autoDistance: typeof row?.autoDistance === "boolean" ? row.autoDistance : fallback.autoDistance,
        status: row?.status === "idle" || row?.status === "geocoding" || row?.status === "routing" || row?.status === "error"
            ? row.status
            : fallback.status,
        statusMessage: typeof row?.statusMessage === "string" ? row.statusMessage : fallback.statusMessage,
    };
}
function normalizeLocations(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return makeDefaultLocations();
    }
    return rows.map((row, index) => normalizeLocationRow(row, index));
}
function normalizeDepartmentAllowances(rows) {
    if (!Array.isArray(rows))
        return [];
    return rows.map((row, index) => ({
        id: row.id || `${Date.now()}_${index}_${Math.random()}`,
        name: row.name ?? "",
        employeeCount: clampNonNegativeNumber(row.employeeCount),
        allowancePerEmployee: clampNonNegativeNumber(row.allowancePerEmployee),
    }));
}
function normalizeContact(contact) {
    const defaults = makeDefaultContact();
    return {
        companyName: typeof contact?.companyName === "string" ? contact.companyName : defaults.companyName,
        fullName: typeof contact?.fullName === "string" ? contact.fullName : defaults.fullName,
        email: typeof contact?.email === "string" ? contact.email : defaults.email,
        phone: typeof contact?.phone === "string" ? contact.phone : defaults.phone,
    };
}
function mergeGuidelines(current, patch) {
    if (!patch)
        return current;
    const restrictionsPatch = isObject(patch.restrictions)
        ? patch.restrictions
        : undefined;
    return {
        ...current,
        ...patch,
        restrictions: {
            ...current.restrictions,
            ...(restrictionsPatch ?? {}),
        },
    };
}
function mergeAddOns(current, patch) {
    if (!patch)
        return current;
    const nextExtraSiteVisits = patch.extraSiteVisits === "" || typeof patch.extraSiteVisits === "number"
        ? patch.extraSiteVisits
        : current.extraSiteVisits;
    return {
        ...current,
        ...patch,
        euPackageAddOns: {
            ...current.euPackageAddOns,
            ...(patch.euPackageAddOns ?? {}),
        },
        extraSiteVisits: nextExtraSiteVisits,
    };
}
function mergeCalculator(current, patch) {
    if (!patch)
        return current;
    const addOnsPatch = isObject(patch.addOns) ? patch.addOns : undefined;
    const contactPatch = isObject(patch.contact) ? patch.contact : undefined;
    return {
        ...current,
        ...patch,
        addOns: mergeAddOns(current.addOns, addOnsPatch),
        contact: normalizeContact({
            ...current.contact,
            ...(contactPatch ?? {}),
        }),
        locations: Array.isArray(patch.locations) ? normalizeLocations(patch.locations) : current.locations,
        departmentAllowances: Array.isArray(patch.departmentAllowances)
            ? normalizeDepartmentAllowances(patch.departmentAllowances)
            : current.departmentAllowances,
        departmentConfigs: Array.isArray(patch.departmentConfigs)
            ? ensureDepartmentConfigs(patch.departmentConfigs, 0)
            : current.departmentConfigs,
    };
}
export function mergeDraft(current, patch) {
    const builderPatch = isObject(patch.builder)
        ? patch.builder
        : undefined;
    const calculatorPatch = isObject(patch.calculator)
        ? patch.calculator
        : undefined;
    const next = {
        ...current,
        builder: {
            ...current.builder,
            ...(builderPatch ?? {}),
            guidelines: mergeGuidelines(current.builder.guidelines, builderPatch?.guidelines),
        },
        calculator: mergeCalculator(current.calculator, calculatorPatch),
    };
    const minDepartmentRows = next.builder.guidelines.allowanceScope === "department_based" ? 2 : 0;
    return {
        ...next,
        calculator: {
            ...next.calculator,
            locations: normalizeLocations(next.calculator.locations),
            departmentAllowances: normalizeDepartmentAllowances(next.calculator.departmentAllowances),
            contact: normalizeContact(next.calculator.contact),
            departmentConfigs: ensureDepartmentConfigs(next.calculator.departmentConfigs, minDepartmentRows),
        },
    };
}
export function deserializeDraft(value) {
    const defaults = createDefaultDraft();
    if (!isObject(value))
        return defaults;
    return mergeDraft(defaults, value);
}
export function serializeDraft(draft) {
    return JSON.stringify(draft);
}
