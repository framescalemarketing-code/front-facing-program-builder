export type EUPackage = "Compliance" | "Comfort" | "Complete" | "Covered";
export type ServiceTier = "Essential" | "Access" | "Premier" | "Enterprise";
export type PaymentTerms = "NET30" | "NET45" | "NET60" | "NET75" | "NET90";
export type PaymentDiscount = "none" | "2_15_NET30" | "3_10_NET30";

export type SideShieldType = "removable" | "permanent" | "integrated";
export type EligibilityFrequency = "annual" | "biennial" | string;
export type CoverageType = "prescription_only" | "prescription_and_plano" | "plano_only";
export type AllowanceScope = "companywide" | "department_based";

export type EUPackageAddOnKey =
  | "polarized"
  | "antiFog"
  | "antiReflectiveStd"
  | "blueLightAntiReflective"
  | "tint"
  | "transitions"
  | "transitionsPolarized"
  | "extraScratchCoating";

export type LocationRow = {
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  additionalOnsiteVisits: number;
  oneWayMiles: number;
  oneWayMinutes: number;
  autoDistance: boolean;
  status: "idle" | "geocoding" | "routing" | "error";
  statusMessage: string;
};

export type DepartmentSelections = {
  euPackageAddOns: Partial<Record<EUPackageAddOnKey, boolean>>;
};

export type DepartmentConfigRow = {
  id: string;
  name: string;
  employeeCount: number;
  selections: DepartmentSelections;
};

export type AddOns = {
  euPackageAddOns: Record<EUPackageAddOnKey, boolean>;
  nonPrescriptionCustomSafetyGlasses: boolean;
  extraSiteVisits: number | "";
};

export type Contact = { companyName: string; fullName: string; role: string; email: string; phone: string };

export type BuilderGuidelines = {
  sideShieldType: SideShieldType;
  eligibilityFrequency?: string;
  coverageType: CoverageType;
  allowanceScope: AllowanceScope;
  approvalWorkflowEnabled: boolean;
  restrictions: {
    restrictSunglassOptions: boolean;
    restrictUvReactivePhotochromicLenses: boolean;
  };
  notes?: string;
};

export type BuilderState = { guidelines: BuilderGuidelines };

export type ProgramState = {
  eligibleEmployees: number | "";
  selectedEU: EUPackage | "";
  selectedTier: ServiceTier | "";
  paymentTerms: PaymentTerms;
  paymentDiscount: PaymentDiscount;
  addOns: AddOns;
  departmentAllowances?: Array<unknown>;
  departmentConfigs?: DepartmentConfigRow[];
  locations: LocationRow[];
  contact: Contact;
};

export type DraftBase = {
  builder: BuilderState;
  program: ProgramState;
  programConfig?: {
    active?: unknown;
    manualDraftSnapshot?: Draft;
  };
};

export type Draft = DraftBase;

const emptyEuPackageAddOns = (): Record<EUPackageAddOnKey, boolean> => ({
  polarized: false,
  antiFog: false,
  antiReflectiveStd: false,
  blueLightAntiReflective: false,
  tint: false,
  transitions: false,
  transitionsPolarized: false,
  extraScratchCoating: false,
});



export const makeDefaultLocations = (): LocationRow[] => [
  {
    label: "Location 1",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    additionalOnsiteVisits: 0,
    oneWayMiles: 0,
    oneWayMinutes: 0,
    autoDistance: true,
    status: "idle",
    statusMessage: "",
  },
];

const makeDefaultAddOns = (): AddOns => ({
  euPackageAddOns: emptyEuPackageAddOns(),
  nonPrescriptionCustomSafetyGlasses: false,
  extraSiteVisits: 0,
});

const makeDefaultGuidelines = (): BuilderGuidelines => ({
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

const makeDefaultContact = (): Contact => ({
  companyName: "",
  fullName: "",
  role: "",
  email: "",
  phone: "",
});

export function createDefaultDraft(): Draft {
  const program: ProgramState = {
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
  };

  return {
    builder: {
      guidelines: makeDefaultGuidelines(),
    },
    program,
    programConfig: {
      active: undefined,
      manualDraftSnapshot: undefined,
    },
  };
}

export const defaultDraft: Draft = createDefaultDraft();

export const makeDepartmentSelections = (): DepartmentSelections => ({
  euPackageAddOns: emptyEuPackageAddOns(),
});

export function makeDepartmentConfigRow(): DepartmentConfigRow {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random()}`;

  return {
    id,
    name: "",
    employeeCount: 0,
    selections: makeDepartmentSelections(),
  };
}

export function ensureDepartmentConfigs(
  rows: DepartmentConfigRow[] | undefined | null,
  minCount = 2
): DepartmentConfigRow[] {
  const safeRows = Array.isArray(rows) ? rows : [];

  const normalized: DepartmentConfigRow[] = safeRows.map((row, idx) => {
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

export type BuilderGuidelinesPatch = Partial<BuilderGuidelines> & {
  restrictions?: Partial<BuilderGuidelines["restrictions"]>;
};

export type AddOnsPatch = Partial<AddOns> & {
  euPackageAddOns?: Partial<Record<EUPackageAddOnKey, boolean>>;
};

export type ProgramStatePatch = Partial<ProgramState> & {
  addOns?: AddOnsPatch;
  contact?: Partial<Contact>;
};

export type DraftPatch = {
  builder?: Partial<BuilderState> & { guidelines?: BuilderGuidelinesPatch };
  program?: ProgramStatePatch;
  programConfig?: {
    active?: unknown;
    manualDraftSnapshot?: Draft;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampNonNegativeNumber(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeLocationRow(row: Partial<LocationRow> | undefined, index: number): LocationRow {
  const fallback = makeDefaultLocations()[0];
  return {
    label: typeof row?.label === "string" && row.label.trim() ? row.label : `Location ${index + 1}`,
    streetAddress: typeof row?.streetAddress === "string" ? row.streetAddress : fallback.streetAddress,
    city: typeof row?.city === "string" ? row.city : fallback.city,
    state: typeof row?.state === "string" ? row.state : fallback.state,
    zipCode: typeof row?.zipCode === "string" ? row.zipCode : fallback.zipCode,
    additionalOnsiteVisits: clampNonNegativeNumber(row?.additionalOnsiteVisits, fallback.additionalOnsiteVisits),
    oneWayMiles: clampNonNegativeNumber(row?.oneWayMiles, fallback.oneWayMiles),
    oneWayMinutes: clampNonNegativeNumber(row?.oneWayMinutes, fallback.oneWayMinutes),
    autoDistance: typeof row?.autoDistance === "boolean" ? row.autoDistance : fallback.autoDistance,
    status:
      row?.status === "idle" || row?.status === "geocoding" || row?.status === "routing" || row?.status === "error"
        ? row.status
        : fallback.status,
    statusMessage: typeof row?.statusMessage === "string" ? row.statusMessage : fallback.statusMessage,
  };
}

function normalizeLocations(rows: LocationRow[] | undefined): LocationRow[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return makeDefaultLocations();
  }

  return rows.map((row, index) => normalizeLocationRow(row, index));
}

function normalizeContact(contact: Partial<Contact> | undefined): Contact {
  const defaults = makeDefaultContact();
  return {
    companyName: typeof contact?.companyName === "string" ? contact.companyName : defaults.companyName,
    fullName: typeof contact?.fullName === "string" ? contact.fullName : defaults.fullName,
    role: typeof contact?.role === "string" ? contact.role : defaults.role,
    email: typeof contact?.email === "string" ? contact.email : defaults.email,
    phone: typeof contact?.phone === "string" ? contact.phone : defaults.phone,
  };
}

function mergeGuidelines(current: BuilderGuidelines, patch: BuilderGuidelinesPatch | undefined): BuilderGuidelines {
  if (!patch) return current;
  const restrictionsPatch = isObject(patch.restrictions)
    ? (patch.restrictions as BuilderGuidelines["restrictions"])
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

function mergeAddOns(current: AddOns, patch: AddOnsPatch | undefined): AddOns {
  if (!patch) return current;
  const nextExtraSiteVisits =
    patch.extraSiteVisits === "" || typeof patch.extraSiteVisits === "number"
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

function mergeProgram(current: ProgramState, patch: ProgramStatePatch | undefined): ProgramState {
  if (!patch) return current;
  const addOnsPatch = isObject(patch.addOns) ? (patch.addOns as AddOnsPatch) : undefined;
  const contactPatch = isObject(patch.contact) ? (patch.contact as Partial<Contact>) : undefined;

  return {
    ...current,
    ...patch,
    addOns: mergeAddOns(current.addOns, addOnsPatch),
    contact: normalizeContact({
      ...current.contact,
      ...(contactPatch ?? {}),
    }),
    paymentTerms:
      patch.paymentTerms === "NET30" ||
      patch.paymentTerms === "NET45" ||
      patch.paymentTerms === "NET60" ||
      patch.paymentTerms === "NET75" ||
      patch.paymentTerms === "NET90"
        ? patch.paymentTerms
        : current.paymentTerms,
    paymentDiscount:
      patch.paymentDiscount === "none" ||
      patch.paymentDiscount === "2_15_NET30" ||
      patch.paymentDiscount === "3_10_NET30"
        ? patch.paymentDiscount
        : current.paymentDiscount,
    departmentAllowances: Array.isArray(patch.departmentAllowances)
      ? patch.departmentAllowances
      : current.departmentAllowances,
    locations: Array.isArray(patch.locations) ? normalizeLocations(patch.locations) : current.locations,
    departmentConfigs: Array.isArray(patch.departmentConfigs)
      ? ensureDepartmentConfigs(patch.departmentConfigs, 0)
      : current.departmentConfigs,
  };
}

export function mergeDraft(current: Draft, patch: DraftPatch): Draft {
  const builderPatch = isObject(patch.builder)
    ? (patch.builder as DraftPatch["builder"])
    : undefined;
  const programPatch = isObject(patch.program)
    ? (patch.program as DraftPatch["program"])
    : undefined;
  const programConfigPatch = isObject(patch.programConfig)
    ? (patch.programConfig as DraftPatch["programConfig"])
    : undefined;

  const next: Draft = {
    ...current,
    builder: {
      ...current.builder,
      ...(builderPatch ?? {}),
      guidelines: mergeGuidelines(current.builder.guidelines, builderPatch?.guidelines),
    },
    program: mergeProgram(current.program, programPatch),
    programConfig: programConfigPatch
      ? {
          ...(current.programConfig ?? {}),
          ...programConfigPatch,
        }
      : current.programConfig,
  };

  const minDepartmentRows = next.builder.guidelines.allowanceScope === "department_based" ? 2 : 0;
  const normalizedProgram = {
    ...next.program,
    locations: normalizeLocations(next.program.locations),
    contact: normalizeContact(next.program.contact),
    departmentConfigs: ensureDepartmentConfigs(next.program.departmentConfigs, minDepartmentRows),
  };

  return {
    ...next,
    program: normalizedProgram,
  };
}

export function deserializeDraft(value: unknown): Draft {
  const defaults = createDefaultDraft();
  if (!isObject(value)) return defaults;
  return mergeDraft(defaults, value as DraftPatch);
}

export function serializeDraft(draft: Draft): string {
  return JSON.stringify(draft);
}
