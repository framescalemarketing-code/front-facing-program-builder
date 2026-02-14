// P02b_ProgramCalculator.tsx
"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { isOptionRestricted, isOptionVisible } from "@/lib/dependencyRules";
import { calculateCompanywideAllowance, includeEuAddOnsInAllowance } from "@/lib/allowanceMath";
import { makeDepartmentConfigRow } from "@/lib/programDraft";
import type {
  AddOns,  EUPackage,
  EUPackageAddOnKey,  LocationRow,
  DepartmentConfigRow,
  PaymentDiscount,
  PaymentTerms,
  ServiceTier,
} from "@/lib/programDraft";

type LatLon = { lat: number; lon: number };
type NominatimResult = { lat?: string | number; lon?: string | number };
type OSRMResponse = { routes?: Array<{ distance?: number; duration?: number }> };

const SHOWROOM_ADDRESS = "6780 Miramar Rd, San Diego, CA 92121";

const PRICING = {
  onboardingFeeSingleSiteStandard: 1200,
  onboardingFeeAdditionalSite: 500,

  extraSiteVisitFee: 60,

  euAllowancePerEmployee: {
    Compliance: 235,
    Comfort: 290,
    Complete: 435,
    Covered: 435,
  } satisfies Record<EUPackage, number>,

  serviceFeePerEmployee: {
    Essential: 65,
    Access: 85,
    Premier: 105,
    Enterprise: 155,
  } satisfies Record<ServiceTier, number>,

  standardVisitsByTier: {
    Essential: 2,
    Access: 6,
    Premier: 12,
    Enterprise: 24,
  } satisfies Record<ServiceTier, number>,

  euPackageAddOnsPerEmployee: {
    polarized: 135,
    antiFog: 50,
    antiReflectiveStd: 55,
    blueLightAntiReflective: 100,
    tint: 40,
    transitions: 135,
    transitionsPolarized: 165,
    extraScratchCoating: 50,
  } satisfies Record<EUPackageAddOnKey, number>,

  travel: {
    includedOneWayMiles: 50,
    dollarsPerMileOver: 1,
    roundTripMultiplier: 2,
  },

  financeFeesPerInvoice: {
    NET30: 0,
    NET45: 15,
    NET60: 30,
    NET75: 45,
    NET90: 60,
  } satisfies Record<PaymentTerms, number>,

  paymentDiscounts: {
    none: 0,
    "2_15_NET30": 0.02,
    "3_10_NET30": 0.03,
  } satisfies Record<PaymentDiscount, number>,
};


const EU_PACKAGE_ADD_ON_ITEMS: Array<{
  key: EUPackageAddOnKey;
  label: string;
  amount: number;
}> = [
  { key: "antiFog", label: "Anti-Fog", amount: PRICING.euPackageAddOnsPerEmployee.antiFog },
  { key: "antiReflectiveStd", label: "Anti-Reflective", amount: PRICING.euPackageAddOnsPerEmployee.antiReflectiveStd },
  {
    key: "blueLightAntiReflective",
    label: "Blue Light + Anti-Reflective Coating",
    amount: PRICING.euPackageAddOnsPerEmployee.blueLightAntiReflective,
  },
  { key: "extraScratchCoating", label: "Extra Scratch Coating", amount: PRICING.euPackageAddOnsPerEmployee.extraScratchCoating },
  { key: "polarized", label: "Polarized Sun Glasses", amount: PRICING.euPackageAddOnsPerEmployee.polarized },
  { key: "tint", label: "Tint", amount: PRICING.euPackageAddOnsPerEmployee.tint },
  { key: "transitions", label: "Transitions", amount: PRICING.euPackageAddOnsPerEmployee.transitions },
  { key: "transitionsPolarized", label: "Transitions Polarized", amount: PRICING.euPackageAddOnsPerEmployee.transitionsPolarized },
];


const EU_ADD_ON_DESCRIPTIONS: Record<EUPackageAddOnKey, string> = {
  antiFog: "Helps reduce lens fog in hot or humid environments.",
  antiReflectiveStd: "Reduces glare and improves clarity in bright lighting.",
  blueLightAntiReflective: "Reduces blue light exposure and adds anti reflective coating.",
  extraScratchCoating: "Adds durability for higher wear environments.",
  polarized: "Improves glare reduction in bright outdoor conditions.",
  tint: "Adds a fixed lens tint for comfort in bright environments.",
  transitions: "Darkens lenses in UV light using photochromic technology.",
  transitionsPolarized: "Combines UV reactive photochromic and polarized properties.",
};


function formatMoney(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}


function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function clampNumber(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function summarizeDepartmentConfigs(rows: DepartmentConfigRow[]) {
  const totalEmployees = rows.reduce((sum, row) => sum + clampInt(row.employeeCount), 0);
  const validCount = rows.filter((row) => row.name.trim() && clampInt(row.employeeCount) > 0).length;
  return { totalEmployees, validCount };
}

function departmentAllowanceSubtotal(
  row: Pick<DepartmentConfigRow, "employeeCount" | "selections">,
  baseAllowance: number,
  includeAddOnsInAllowance: boolean
) {
  const employees = clampInt(row.employeeCount);
  const selectedAddOns = row.selections?.euPackageAddOns;

  let addOnsPerEmployee = 0;
  const selectedAddOnsLabels: string[] = [];

  if (includeAddOnsInAllowance) {
    for (const item of EU_PACKAGE_ADD_ON_ITEMS) {
      if (selectedAddOns?.[item.key]) {
        addOnsPerEmployee += item.amount;
        selectedAddOnsLabels.push(item.label);
      }
    }
  }

  const allowancePerEmployee = baseAllowance + addOnsPerEmployee;
  return {
    employees,
    allowancePerEmployee,
    allowanceSubtotal: allowancePerEmployee * employees,
    selectedAddOnsLabels,
  };
}


type DepartmentRowEditorProps = {
  row: DepartmentConfigRow;
  canRemove: boolean;
  secondaryButtonClass: string;
  visibleEuAddOnItems: Array<{
    key: EUPackageAddOnKey;
    label: string;
    amount: number;
  }>;
  onNameInput: (id: string, next: string) => void;
  onNameCommit: (id: string) => void;
  getNameValue: (row: DepartmentConfigRow) => string;
  onEmployeeCountInput: (id: string, next: string) => void;
  onEmployeeCountCommit: (id: string) => string;
  getEmployeeCountValue: (row: DepartmentConfigRow) => string;
  onRemove: (id: string) => void;
  onToggleAddOn: (id: string, key: EUPackageAddOnKey, next: boolean) => void;
};

const DepartmentRowEditor = memo(function DepartmentRowEditor({
  row,
  canRemove,
  secondaryButtonClass,
  visibleEuAddOnItems,
  onNameInput,
  onNameCommit,
  getNameValue,
  onEmployeeCountInput,
  onEmployeeCountCommit,
  getEmployeeCountValue,
  onRemove,
  onToggleAddOn,
}: DepartmentRowEditorProps) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
        <label className="space-y-2 sm:col-span-6">
          <div className="text-sm font-medium text-foreground">Department Name</div>
          <input
            type="text"
            defaultValue={getNameValue(row)}
            onInput={(e) => {
              const next = (e.target as HTMLInputElement).value;
              onNameInput(row.id, next);
            }}
            onBlur={() => onNameCommit(row.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
            placeholder="Department"
          />
        </label>

        <label className="space-y-2 sm:col-span-4">
          <div className="text-sm font-medium text-foreground">Estimated Employees</div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={getEmployeeCountValue(row)}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              const raw = target.value;
              const next = raw.replace(/[^\d]/g, "");
              target.value = next;
              onEmployeeCountInput(row.id, next);
            }}
            onBlur={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = onEmployeeCountCommit(row.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
          />
        </label>

        <div className="sm:col-span-2 flex justify-end">
          {canRemove ? (
            <button
              type="button"
              onClick={() => onRemove(row.id)}
              className={secondaryButtonClass}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">EU Package Add Ons</div>
        <div className="space-y-2">
          {visibleEuAddOnItems.map((item) => (
            <label key={item.key} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
              <input
                type="checkbox"
                checked={Boolean(row.selections.euPackageAddOns[item.key])}
                onChange={(e) => onToggleAddOn(row.id, item.key, e.target.checked)}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="text-sm text-foreground">
                  {item.label} <span className="text-muted-foreground">({formatMoney(item.amount)} per Employee)</span>
                </div>
                <div className="text-xs text-muted-foreground">{EU_ADD_ON_DESCRIPTIONS[item.key]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
});

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatMiles(n: number) {
  const rounded = round1(clampNumber(n));
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
}

function normalizeAutoOneWayMiles(n: number) {
  return Math.max(0, Math.floor(clampNumber(n)));
}

function milesOverIncludedOneWay(n: number) {
  return Math.max(0, clampNumber(n) - PRICING.travel.includedOneWayMiles);
}

function sitesIncludedLabel(selectedTier: ServiceTier | "") {
  return selectedTier ? `Visits Included In ${selectedTier} Service Tier` : "Visits Included In Service Tier";
}

function sitesIncludedSubtext() {
  return "Your selected service tier includes a standard number of visits per year.";
}

function formatLocationAddress(loc: Pick<LocationRow, "streetAddress" | "city" | "state" | "zipCode">) {
  const street = loc.streetAddress.trim();
  const city = loc.city.trim();
  const state = loc.state.trim();
  const zip = loc.zipCode.trim();

  const line2Parts: string[] = [];
  if (city) line2Parts.push(city);
  if (state) line2Parts.push(state);
  if (zip) line2Parts.push(zip);

  const line2 = line2Parts.join(", ").replace(", ,", ",").trim();

  if (street && line2) return `${street}, ${line2}`;
  if (street) return street;
  if (line2) return line2;
  return "";
}

function isAddressCompleteEnough(loc: Pick<LocationRow, "streetAddress" | "city" | "state" | "zipCode">) {
  const street = loc.streetAddress.trim();
  const city = loc.city.trim();
  const state = loc.state.trim();
  return Boolean(street && city && state);
}

function normalizeAddressKey(loc: Pick<LocationRow, "streetAddress" | "city" | "state" | "zipCode">) {
  const parts = [
    loc.streetAddress.trim().toLowerCase(),
    loc.city.trim().toLowerCase(),
    loc.state.trim().toLowerCase(),
    loc.zipCode.trim().toLowerCase(),
  ];
  return parts.join("|").replace(/\s+/g, " ").trim();
}

function travelMath(oneWayMiles: number, totalVisits: number) {
  const oneWay = clampNumber(oneWayMiles);
  const overOneWay = Math.max(0, oneWay - PRICING.travel.includedOneWayMiles);
  const overRoundTrip = overOneWay * PRICING.travel.roundTripMultiplier;
  const feePerVisit = overRoundTrip * PRICING.travel.dollarsPerMileOver;
  const total = feePerVisit * totalVisits;

  return {
    oneWay,
    billableRoundTripMiles: overRoundTrip,
    feePerVisit,
    total,
  };
}

function safeNumber(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

async function geocodeWithNominatim(
  loc: Pick<LocationRow, "streetAddress" | "city" | "state" | "zipCode">
): Promise<LatLon> {
  const street = loc.streetAddress.trim();
  const city = loc.city.trim();
  const state = loc.state.trim();
  const zip = loc.zipCode.trim();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("street", street);
  url.searchParams.set("city", city);
  url.searchParams.set("state", state);
  if (zip) url.searchParams.set("postalcode", zip);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) throw new Error(`Geocoding failed (${resp.status}).`);

  const data = (await resp.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) throw new Error("No result found for this address.");

  const [first] = data as NominatimResult[];
  const lat = safeNumber(first?.lat);
  const lon = safeNumber(first?.lon);

  if (!lat || !lon) throw new Error("Geocoding returned an invalid location.");

  return { lat, lon };
}

async function routeWithOSRMProvider(
  baseHost: string,
  origin: LatLon,
  destination: LatLon
): Promise<{ miles: number; minutes: number }> {
  const baseUrl =
    `${baseHost}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

  const buildUrl = (includeAlternatives: boolean) => {
    const url = new URL(baseUrl);
    url.searchParams.set("overview", "false");
    if (includeAlternatives) url.searchParams.set("alternatives", "true");
    url.searchParams.set("steps", "false");
    url.searchParams.set("annotations", "false");
    return url;
  };

  let resp = await fetch(buildUrl(true).toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!resp.ok && resp.status === 400) {
    resp = await fetch(buildUrl(false).toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  if (!resp.ok) throw new Error(`Routing failed (${resp.status}).`);

  const data = (await resp.json()) as OSRMResponse;
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const best = routes
    .map((r) => ({
      distance: safeNumber(r?.distance),
      duration: safeNumber(r?.duration),
    }))
    .filter((r) => r.distance && r.duration)
    .sort((a, b) => a.distance - b.distance)[0];

  const meters = best?.distance ?? 0;
  const seconds = best?.duration ?? 0;

  if (!meters || !seconds) throw new Error("Routing returned an invalid result.");

  return {
    miles: meters / 1609.344,
    minutes: Math.round(seconds / 60),
  };
}

async function routeWithAppleProvider(origin: LatLon, destination: LatLon): Promise<{ miles: number; minutes: number }> {
  const resp = await fetch("/api/apple-route", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ origin, destination }),
  });

  if (!resp.ok) throw new Error(`Apple routing failed (${resp.status}).`);

  const data = (await resp.json()) as { miles?: unknown; minutes?: unknown };
  const miles = safeNumber(data?.miles);
  const minutes = safeNumber(data?.minutes);
  if (!miles) throw new Error("Apple routing returned an invalid result.");

  return { miles, minutes: Math.max(0, Math.round(minutes)) };
}

async function routeWithOSRM(origin: LatLon, destination: LatLon): Promise<{ miles: number; minutes: number }> {
  const results = await Promise.all([
    (async () => {
      try {
        return await routeWithAppleProvider(origin, destination);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await routeWithOSRMProvider("https://router.project-osrm.org", origin, destination);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await routeWithOSRMProvider("https://routing.openstreetmap.de/routed-car", origin, destination);
      } catch {
        return null;
      }
    })(),
  ]);

  const valid = results.filter((r): r is { miles: number; minutes: number } => Boolean(r));
  if (valid.length === 0) {
    throw new Error("Routing failed (all providers unavailable).");
  }

  return valid.sort((a, b) => a.miles - b.miles)[0];
}

function discountLabel(d: PaymentDiscount) {
  if (d === "2_15_NET30") return "2 percent discount if paid in 15 days";
  if (d === "3_10_NET30") return "3 percent discount if paid in 10 days";
  return "No discount";
}

function makeDefaultLocations(): LocationRow[] {
  const status = "Enter street, city, and state to calculate distance. You can enter miles manually at any time.";

  return [
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
      statusMessage: status,
    },
  ];
}

type EstimateDepartmentLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  allowancePerEmployee: number;
  allowanceTotal: number;
  selectedAddOnsLabels: string[];
};

type EstimateModel = {
  employees: number;
  onboardingBase: number;
  additionalSitesCount: number;
  onboardingAdditionalSitesFeePerSite: number;
  onboardingAdditionalSitesTotal: number;
  onboardingFee: number;
  selectedEU: EUPackage | "";
  selectedTier: ServiceTier | "";
  euBaseAllowance: number;
  euPackageAddOnsPerEmployee: number;
  coveredExampleFloorPerEmployee: number;
  coveredExampleFloorTotal: number;
  coveredExampleCeilingPerEmployee: number;
  coveredExampleCeilingTotal: number;
  coveredExampleAntiFogPerEmployee: number;
  coveredExampleAntiReflectivePerEmployee: number;
  coveredExampleTintPerEmployee: number;
  coveredSelectedAddOnsLabels: string[];
  coveredExampleCombinationPerEmployee: number;
  coveredExampleCombinationTotal: number;
  allowancePerEmployee: number;
  allowanceTotal: number;
  tierBaseServicePerEmployee: number;
  servicePerEmployee: number;
  serviceTotal: number;
  includedVisits: number;
  extraVisits: number;
  totalVisits: number;
  extraVisitsFee: number;
  travelByLocation: Array<{
    label: string;
    address: string;
    oneWayMiles: number;
    includedVisits: number;
    extraVisits: number;
    totalVisits: number;
    billableRoundTripMiles: number;
    feePerVisit: number;
    total: number;
  }>;
  travelTotal: number;
  subtotal: number;
  paymentTerms: PaymentTerms;
  financeFeePerInvoice: number;
  financeFeeTotal: number;
  paymentDiscount: PaymentDiscount;
  discountPct: number;
  invoicePerEmployee: number;
  invoiceTotal: number;
  discountPerEmployeeMax: number;
  discountTotalMax: number;
  grandTotal: number;
  isDepartmentBased: boolean;
  departmentBreakdown: EstimateDepartmentLine[];
};

type EstimateBreakdownProps = {
  estimate: EstimateModel;
  travelExplanation: string;
  destructiveButtonClass: string;
  primaryButtonClass: string;
  continueDisabled: boolean;
  continueBlockMessage: string;
  onClearAll: () => void;
  onContinue: () => void;
};

type DepartmentAllowanceBreakdownProps = {
  rows: EstimateDepartmentLine[];
  employeesTotal: number;
  allowanceTotal: number;
};

type DepartmentServiceBreakdownLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  servicePerEmployee: number;
  serviceSubtotal: number;
};

const DepartmentAllowanceBreakdown = memo(function DepartmentAllowanceBreakdown({
  rows,
  employeesTotal,
  allowanceTotal,
}: DepartmentAllowanceBreakdownProps) {
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="mb-2 text-sm font-semibold text-foreground">Department Allowance Breakdown</div>
      <table className="min-w-full text-xs text-muted-foreground">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2 font-semibold text-foreground">Department</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Employees</th>
            <th className="py-1 px-2 font-semibold text-foreground">Add Ons</th>
                        <th className="py-1 px-2 text-right font-semibold text-foreground">Allowance per Employee</th>
            <th className="py-1 pl-2 text-right font-semibold text-foreground">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-1 pr-2 text-foreground">{row.departmentName}</td>
              <td className="py-1 px-2 text-right">{row.employeeCount}</td>
              <td className="py-1 px-2">{row.selectedAddOnsLabels.length ? row.selectedAddOnsLabels.join(", ") : ""}</td>
              <td className="py-1 px-2 text-right">{formatMoney(row.allowancePerEmployee)}</td>
              <td className="py-1 pl-2 text-right">{formatMoney(row.allowanceTotal)}</td>
            </tr>
          ))}
          <tr className="font-semibold text-foreground">
            <td className="py-1 pr-2">Totals</td>
            <td className="py-1 px-2 text-right">{employeesTotal}</td>
            <td className="py-1 px-2"></td>
            <td className="py-1 px-2 text-right"></td>
            <td className="py-1 pl-2 text-right">{formatMoney(allowanceTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

const DepartmentServiceBreakdown = memo(function DepartmentServiceBreakdown({
  rows,
  employeesTotal,
  serviceTotal,
}: {
  rows: DepartmentServiceBreakdownLine[];
  employeesTotal: number;
  serviceTotal: number;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="mb-2 text-sm font-semibold text-foreground">Service Tier Breakdown by Department</div>
      <table className="min-w-full text-xs text-muted-foreground">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2 font-semibold text-foreground">Department</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Employees</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Service per Employee</th>
            <th className="py-1 pl-2 text-right font-semibold text-foreground">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-1 pr-2 text-foreground">{row.departmentName}</td>
              <td className="py-1 px-2 text-right">{row.employeeCount}</td>
              <td className="py-1 px-2 text-right">{formatMoney(row.servicePerEmployee)}</td>
              <td className="py-1 pl-2 text-right">{formatMoney(row.serviceSubtotal)}</td>
            </tr>
          ))}
          <tr className="font-semibold text-foreground">
            <td className="py-1 pr-2">Totals</td>
            <td className="py-1 px-2 text-right">{employeesTotal}</td>
            <td className="py-1 px-2 text-right"></td>
            <td className="py-1 pl-2 text-right">{formatMoney(serviceTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

type DepartmentDiscountBreakdownLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  invoicePerEmployee: number;
  discountPct: number;
  discountPerEmployeeMax: number;
  discountTotalMax: number;
};

type DepartmentDiscountBreakdownProps = {
  rows: DepartmentDiscountBreakdownLine[];
};

const DepartmentDiscountBreakdown = memo(function DepartmentDiscountBreakdown({
  rows,
}: DepartmentDiscountBreakdownProps) {
  const employeesTotal = rows.reduce((sum, row) => sum + row.employeeCount, 0);
  const discountTotalMax = rows.reduce((sum, row) => sum + row.discountTotalMax, 0);

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-xs text-muted-foreground">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2 font-semibold text-foreground">Department</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Employees</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Invoice per Employee</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Discount Percent</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Max Discount per Invoice</th>
            <th className="py-1 pl-2 text-right font-semibold text-foreground">Max Discount Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-1 pr-2 text-foreground">{row.departmentName}</td>
              <td className="py-1 px-2 text-right">{row.employeeCount}</td>
              <td className="py-1 px-2 text-right">{formatMoney(row.invoicePerEmployee)}</td>
              <td className="py-1 px-2 text-right">{`${(row.discountPct * 100).toFixed(0)}%`}</td>
              <td className="py-1 px-2 text-right">{formatMoney(row.discountPerEmployeeMax)}</td>
              <td className="py-1 pl-2 text-right">{formatMoney(row.discountTotalMax)}</td>
            </tr>
          ))}
          <tr className="font-semibold text-foreground">
            <td className="py-1 pr-2">Totals</td>
            <td className="py-1 px-2 text-right">{employeesTotal}</td>
            <td className="py-1 px-2 text-right"></td>
            <td className="py-1 px-2 text-right"></td>
            <td className="py-1 px-2 text-right"></td>
            <td className="py-1 pl-2 text-right">{formatMoney(discountTotalMax)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});


type DepartmentInvoiceBreakdownLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  invoicePerEmployee: number;
  invoiceTotal: number;
  financeFeePerInvoice: number;
  financeFeeTotal: number;
};



const DepartmentInvoiceBreakdown = memo(function DepartmentInvoiceBreakdown({
  rows,
  showFees,
}: {
  rows: DepartmentInvoiceBreakdownLine[];
  showFees: boolean;
}) {
  const employeesTotal = rows.reduce((sum, row) => sum + row.employeeCount, 0);
  const invoiceTotal = rows.reduce((sum, row) => sum + row.invoiceTotal, 0);
  const financeFeeTotal = rows.reduce((sum, row) => sum + row.financeFeeTotal, 0);

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-xs text-muted-foreground">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2 font-semibold text-foreground">Department</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Employees</th>
            <th className="py-1 px-2 text-right font-semibold text-foreground">Invoice per Employee</th>
            {showFees ? (
              <th className="py-1 px-2 text-right font-semibold text-foreground">Finance Fee per Invoice</th>
            ) : null}
            <th className="py-1 pl-2 text-right font-semibold text-foreground">Invoice Total</th>
            {showFees ? (
              <th className="py-1 pl-2 text-right font-semibold text-foreground">Finance Fee Total</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-1 pr-2 text-foreground">{row.departmentName}</td>
              <td className="py-1 px-2 text-right">{row.employeeCount}</td>
              <td className="py-1 px-2 text-right">{formatMoney(row.invoicePerEmployee)}</td>
              {showFees ? (
                <td className="py-1 px-2 text-right">{formatMoney(row.financeFeePerInvoice)}</td>
              ) : null}
              <td className="py-1 pl-2 text-right">{formatMoney(row.invoiceTotal)}</td>
              {showFees ? (
                <td className="py-1 pl-2 text-right">{formatMoney(row.financeFeeTotal)}</td>
              ) : null}
            </tr>
          ))}
          <tr className="font-semibold text-foreground">
            <td className="py-1 pr-2">Totals</td>
            <td className="py-1 px-2 text-right">{employeesTotal}</td>
            <td className="py-1 px-2 text-right"></td>
            {showFees ? <td className="py-1 px-2 text-right"></td> : null}
            <td className="py-1 pl-2 text-right">{formatMoney(invoiceTotal)}</td>
            {showFees ? <td className="py-1 pl-2 text-right">{formatMoney(financeFeeTotal)}</td> : null}
          </tr>
        </tbody>
      </table>
    </div>
  );
});

const EstimateBreakdown = memo(function EstimateBreakdown({
  estimate,
  travelExplanation,
  destructiveButtonClass,
  primaryButtonClass,
  continueDisabled,
  continueBlockMessage,
  onClearAll,
  onContinue,
}: EstimateBreakdownProps) {
  const [showDeptBreakdown, setShowDeptBreakdown] = useState(false);
  const [showServiceTierDeptBreakdown, setShowServiceTierDeptBreakdown] = useState(false);
  const [showDeptPaymentBreakdown, setShowDeptPaymentBreakdown] = useState(false);

  const departmentDiscountBreakdown = useMemo(() => {
    return estimate.departmentBreakdown.map((row) => {
      const invoicePerEmployee = row.allowancePerEmployee + estimate.servicePerEmployee;
      const discountPerEmployeeMax = invoicePerEmployee * estimate.discountPct;
      const discountTotalMax = invoicePerEmployee * row.employeeCount * estimate.discountPct;

      return {
        id: row.id,
        departmentName: row.departmentName,
        employeeCount: row.employeeCount,
        invoicePerEmployee,
        discountPct: estimate.discountPct,
        discountPerEmployeeMax,
        discountTotalMax,
      };
    });
  }, [estimate.departmentBreakdown, estimate.discountPct, estimate.servicePerEmployee]);

  const departmentInvoiceBreakdown = useMemo(() => {
    return estimate.departmentBreakdown.map((row) => {
      const invoicePerEmployee = row.allowancePerEmployee + estimate.servicePerEmployee;
      const financeFeePerInvoice = estimate.financeFeePerInvoice;
      return {
        id: row.id,
        departmentName: row.departmentName,
        employeeCount: row.employeeCount,
        invoicePerEmployee,
        invoiceTotal: invoicePerEmployee * row.employeeCount,
        financeFeePerInvoice,
        financeFeeTotal: financeFeePerInvoice * row.employeeCount,
      };
    });
  }, [estimate.departmentBreakdown, estimate.servicePerEmployee, estimate.financeFeePerInvoice]);

  const showDepartmentDiscountBreakdown =
    estimate.isDepartmentBased &&
    estimate.discountPct > 0 &&
    departmentDiscountBreakdown.length > 0;

  const showDepartmentInvoiceBreakdown =
    estimate.isDepartmentBased &&
    estimate.discountPct === 0 &&
    departmentInvoiceBreakdown.length > 0;

  const showDepartmentInvoiceFees = estimate.financeFeePerInvoice > 0;

  const showDepartmentPaymentBreakdownToggle =
    showDepartmentDiscountBreakdown || showDepartmentInvoiceBreakdown;

  const isNet30 = estimate.paymentTerms === "NET30";
  const hasMaxDiscount = estimate.discountPct > 0;
  const invoiceTotalWithMaxDiscount = estimate.invoiceTotal - estimate.discountTotalMax + estimate.financeFeeTotal;
  const invoiceTotalSummaryLabel = hasMaxDiscount ? "Invoice Total (With Max Discount)" : "Invoice Total (With Fees)";
  const invoiceTotalBeforeLabel = estimate.financeFeePerInvoice > 0 ? "Invoice Total (Before Fees)" : "Invoice Total (Before Discount)";

  const departmentServiceBreakdown = useMemo<DepartmentServiceBreakdownLine[]>(() => {
    return estimate.departmentBreakdown.map((row) => ({
      id: row.id,
      departmentName: row.departmentName,
      employeeCount: row.employeeCount,
      servicePerEmployee: estimate.servicePerEmployee,
      serviceSubtotal: estimate.servicePerEmployee * row.employeeCount,
    }));
  }, [estimate.departmentBreakdown, estimate.servicePerEmployee]);

  const departmentPaymentBreakdownLabel = showDepartmentDiscountBreakdown
    ? "Show Department Discount Breakdown"
    : "Show Department Invoice Breakdown";

  return (
    <div className="lg:col-span-5">
      <div className="sticky top-6 rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-6 py-5">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-foreground">Estimate Breakdown</div>
            <div className="text-xs text-muted-foreground">Everything updates automatically based on your inputs.</div>
          </div>
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(100vh-15.25rem)]">
          <div className="space-y-6">
            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">Onboarding Fees</div>
              {estimate.additionalSitesCount <= 0 ? (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>Base Onboarding Fee: {formatMoney(estimate.onboardingBase)}</div>
                  <div>Single location onboarding used.</div>
                </div>
              ) : (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>Base Onboarding Fee: {formatMoney(estimate.onboardingBase)}</div>
                  <div>Additional Locations Count: {estimate.additionalSitesCount}</div>
                  <div>Per Additional Location Fee: {formatMoney(estimate.onboardingAdditionalSitesFeePerSite)}</div>
                  <div>Additional Locations Total: {formatMoney(estimate.onboardingAdditionalSitesTotal)}</div>
                </div>
              )}
              <div className="mt-3 text-xs text-muted-foreground">Onboarding Fees Total</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{formatMoney(estimate.onboardingFee)}</div>
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">EU Package</div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                <div>
                  EU Package: <span className="text-foreground font-medium">{estimate.selectedEU}</span>
                </div>
                <div>
                  {estimate.isDepartmentBased ? "Total Employees" : "Employees"}:{" "}
                  <span className="text-foreground font-medium">{estimate.employees}</span>
                </div>
                {!estimate.isDepartmentBased ? (
                  estimate.selectedEU === "Covered" ? (
                    <>
                      <div>
                        Base allowance per Employee:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.coveredExampleFloorPerEmployee)}</span>
                      </div>
                      <div>
                        Available allowance per Employee:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.coveredExampleCeilingPerEmployee)}</span>
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Different employees can choose different combinations of included options. Total covered value varies by selection.
                      </div>
                      <div className="mt-2 text-xs font-semibold text-foreground">Example combination:</div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        Select options to simulate an employee selecting combinations.
                      </div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        Base allowance of{" "}
                        <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleFloorPerEmployee)}</span>
                        {estimate.coveredSelectedAddOnsLabels.length > 0 ? (
                          <>
                            {" "}
                            +{" "}
                            <span className="font-medium text-foreground">
                              {estimate.coveredSelectedAddOnsLabels.join(" + ")}
                            </span>
                          </>
                        ) : null}{" "}
                        = <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleCombinationPerEmployee)}</span>
                      </div>
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        Multiplied by employees for a subtotal:{" "}
                        <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleCombinationTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        Base Allowance per Employee:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.euBaseAllowance)}</span>
                      </div>
                      <div>
                        Total Allowance per Employee:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.allowancePerEmployee)}</span>
                      </div>
                    </>
                  )
                ) : null}
                {estimate.isDepartmentBased && estimate.selectedEU === "Covered" ? (
                  <>
                    <div>
                      Configured allowance per Employee:{" "}
                      {estimate.departmentBreakdown.map((row, index) => (
                        <span key={row.id}>
                          <span>{`D${index + 1} `}</span>
                          <span className="text-foreground font-medium">{formatMoney(row.allowancePerEmployee)}</span>
                          {index < estimate.departmentBreakdown.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    <div>
                      Available allowance per Employee:{" "}
                      <span className="text-foreground font-medium">{formatMoney(estimate.coveredExampleCeilingPerEmployee)}</span>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Different employees can choose different combinations of included options. Total covered value varies by selection.
                    </div>
                  </>
                ) : null}
              </div>
              {estimate.selectedEU === "Covered" ? (
                <div className="mt-3 space-y-1 text-lg font-semibold text-foreground">
                  <div>
                    {`Total: ${formatMoney(
                      estimate.isDepartmentBased ? estimate.allowanceTotal : estimate.coveredExampleFloorTotal
                    )}`}
                  </div>
                  <div>{`Total (Available Allowance): ${formatMoney(estimate.coveredExampleCeilingTotal)}`}</div>
                </div>
              ) : (
                <div className="mt-3 text-xl font-semibold text-foreground">
                  {estimate.isDepartmentBased
                    ? `Total Allowance Cost: ${formatMoney(estimate.allowanceTotal)}`
                    : formatMoney(estimate.allowanceTotal)}
                </div>
              )}
              {estimate.selectedEU === "Covered" ? (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-foreground/80">Need clarification? Contact an OSSO Program Specialist.</summary>
                  <div className="mt-1">
                    <a href="mailto:team@onsightoptics.com" className="underline">
                      team@onsightoptics.com
                    </a>{" "}
                    <span className="px-1">|</span>
                    <a href="tel:619-402-1033" className="underline">
                      619-402-1033
                    </a>
                  </div>
                </details>
              ) : null}

              {estimate.isDepartmentBased && estimate.departmentBreakdown.length > 0 ? (
                <div className="mt-4 rounded-md bg-secondary p-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground underline underline-offset-4"
                    onClick={() => setShowDeptBreakdown((prev) => !prev)}
                  >
                    {showDeptBreakdown ? "Hide Department Allowance Breakdown" : "Show Department Allowance Breakdown"}
                  </button>

                  {showDeptBreakdown ? (
                    <DepartmentAllowanceBreakdown
                      rows={estimate.departmentBreakdown}
                      employeesTotal={estimate.employees}
                      allowanceTotal={estimate.allowanceTotal}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">Service Tier</div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                <div>
                  Service Tier: <span className="text-foreground font-medium">{estimate.selectedTier}</span>
                </div>
                <div>
                  Service per Employee: <span className="text-foreground font-medium">{formatMoney(estimate.servicePerEmployee)}</span>
                </div>
                <div>
                  Employees: <span className="text-foreground font-medium">{estimate.employees}</span>
                </div>
              </div>
              <div className="mt-3 text-xl font-semibold text-foreground">{formatMoney(estimate.serviceTotal)}</div>

              {estimate.isDepartmentBased && departmentServiceBreakdown.length > 0 ? (
                <div className="mt-4 rounded-md bg-secondary p-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground underline underline-offset-4"
                    onClick={() => setShowServiceTierDeptBreakdown((prev) => !prev)}
                  >
                    {showServiceTierDeptBreakdown
                      ? "Hide Service Tier Breakdown by Department"
                      : "Show Service Tier Breakdown by Department"}
                  </button>

                  {showServiceTierDeptBreakdown ? (
                    <DepartmentServiceBreakdown
                      rows={departmentServiceBreakdown}
                      employeesTotal={estimate.employees}
                      serviceTotal={estimate.serviceTotal}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">{sitesIncludedLabel(estimate.selectedTier)}</div>
              <div className="mt-2 text-sm text-muted-foreground">{sitesIncludedSubtext()}</div>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                <div>
                  Visits Included In Service Tier: <span className="text-foreground font-medium">{estimate.includedVisits}</span>
                </div>
                <div>
                  Additional Visits: <span className="text-foreground font-medium">{estimate.extraVisits}</span>
                </div>
                <div>
                  Total Visits: <span className="text-foreground font-medium">{estimate.totalVisits}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">Additional Visit Fees</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {estimate.extraVisits} Additional Visit(s) x {formatMoney(PRICING.extraSiteVisitFee)}
              </div>
              <div className="mt-3 text-xl font-semibold text-foreground">{formatMoney(estimate.extraVisitsFee)}</div>
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">Travel Surcharge</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Travel Uses Total Visits: Included Onsite Visits Plus Additional Onsite Visits.
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{travelExplanation}</p>

              <div className="mt-4 space-y-3">
                {estimate.travelByLocation.map((t) => (
                  <div key={t.label} className="rounded-md bg-secondary p-3">
                    <div className="text-sm font-semibold text-foreground">{t.label}</div>
                    {t.address?.trim() ? <div className="mt-1 text-xs text-muted-foreground">{t.address}</div> : null}

                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        One Way Miles: <span className="text-foreground font-medium">{formatMiles(t.oneWayMiles)}</span>
                      </div>
                      <div>
                        Miles Over 50 (One Way):{" "}
                        <span className="text-foreground font-medium">{formatMiles(milesOverIncludedOneWay(t.oneWayMiles))}</span>
                      </div>
                      <div>
                        Visits Included In Service Tier: <span className="text-foreground font-medium">{t.includedVisits}</span>
                      </div>
                      <div>
                        Additional Visits: <span className="text-foreground font-medium">{t.extraVisits}</span>
                      </div>
                      <div>
                        Total Visits: <span className="text-foreground font-medium">{t.totalVisits}</span>
                      </div>
                      <div>
                        Billable Miles per Visit (Round Trip):{" "}
                        <span className="text-foreground font-medium">{formatMiles(t.billableRoundTripMiles)}</span>
                      </div>
                      <div>
                        Surcharge per Visit: <span className="text-foreground font-medium">{formatMoney(t.feePerVisit)}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-sm font-semibold text-foreground">{formatMoney(t.total)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md bg-secondary p-3">
                <div className="text-sm font-medium text-muted-foreground">Travel Total</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{formatMoney(estimate.travelTotal)}</div>
              </div>
            </div>

            <div className="rounded-md bg-secondary/30 p-4">
              <div className="text-sm font-semibold text-foreground">Payment Terms</div>
              {estimate.isDepartmentBased ? (
                <>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <div>
                      Terms: <span className="text-foreground font-medium">{estimate.paymentTerms}</span>
                    </div>
                    {!isNet30 ? (
                      <div>
                        Finance Fee Total: <span className="text-foreground font-medium">{formatMoney(estimate.financeFeeTotal)}</span>
                      </div>
                    ) : null}
                    {hasMaxDiscount ? (
                      <div>
                        Maximum Possible Discount Total:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.discountTotalMax)}</span>
                      </div>
                    ) : null}
                  </div>
                  {isNet30 ? (
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      {hasMaxDiscount ? (
                        <>
                          <div>
                            Invoice Total (Before Discount):{" "}
                            <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                          </div>
                          <div className="pt-1 text-base font-semibold text-foreground">
                            Invoice Total (With Max Discount): {formatMoney(invoiceTotalWithMaxDiscount)}
                          </div>
                        </>
                      ) : (
                        <div>
                          Invoice Total: <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        {invoiceTotalBeforeLabel}:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                      </div>
                      {hasMaxDiscount ? (
                        <div>
                          Maximum Possible Discount Total:{" "}
                          <span className="text-foreground font-medium">{formatMoney(estimate.discountTotalMax)}</span>
                        </div>
                      ) : null}
                      <div className="pt-1 text-base font-semibold text-foreground">
                        {invoiceTotalSummaryLabel}: {formatMoney(invoiceTotalWithMaxDiscount)}
                      </div>
                    </div>
                  )}

                  {showDepartmentPaymentBreakdownToggle ? (
                    <div className="mt-4 rounded-md bg-secondary p-3">
                      <button
                        type="button"
                        className="text-sm font-medium text-foreground underline underline-offset-4"
                        onClick={() => setShowDeptPaymentBreakdown((prev) => !prev)}
                      >
                        {showDeptPaymentBreakdown ? "Hide Department Payment Breakdown" : departmentPaymentBreakdownLabel}
                      </button>
                      {showDeptPaymentBreakdown ? (
                        showDepartmentDiscountBreakdown ? (
                          <DepartmentDiscountBreakdown rows={departmentDiscountBreakdown} />
                        ) : showDepartmentInvoiceBreakdown ? (
                          <DepartmentInvoiceBreakdown rows={departmentInvoiceBreakdown} showFees={showDepartmentInvoiceFees} />
                        ) : null
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <div>
                      Terms: <span className="text-foreground font-medium">{estimate.paymentTerms}</span>
                    </div>
                    {!isNet30 ? (
                      <div>
                        Finance Fees per Invoice: <span className="text-foreground font-medium">{formatMoney(estimate.financeFeePerInvoice)}</span>
                      </div>
                    ) : null}
                    {!isNet30 ? (
                      <div>
                        Finance Fees Total: <span className="text-foreground font-medium">{formatMoney(estimate.financeFeeTotal)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-1 text-sm text-muted-foreground">
                    <div>
                      Invoice Amount per Employee: <span className="text-foreground font-medium">{formatMoney(estimate.invoicePerEmployee)}</span>
                    </div>
                    {hasMaxDiscount ? (
                      <>
                        <div>
                          Max Possible Discount per Invoice:{" "}
                          <span className="text-foreground font-medium">{formatMoney(estimate.discountPerEmployeeMax)}</span>
                        </div>
                        <div>
                          Maximum Possible Discount Total:{" "}
                          <span className="text-foreground font-medium">{formatMoney(estimate.discountTotalMax)}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                  {isNet30 ? (
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      {hasMaxDiscount ? (
                        <>
                          <div>
                            Invoice Total (Before Discount):{" "}
                            <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                          </div>
                          <div className="pt-1 text-base font-semibold text-foreground">
                            Invoice Total (With Max Discount): {formatMoney(invoiceTotalWithMaxDiscount)}
                          </div>
                        </>
                      ) : (
                        <div>
                          Invoice Total: <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        {invoiceTotalBeforeLabel}:{" "}
                        <span className="text-foreground font-medium">{formatMoney(estimate.invoiceTotal)}</span>
                      </div>
                      {hasMaxDiscount ? (
                        <div>
                          Maximum Possible Discount Total:{" "}
                          <span className="text-foreground font-medium">{formatMoney(estimate.discountTotalMax)}</span>
                        </div>
                      ) : null}
                      <div className="pt-1 text-base font-semibold text-foreground">
                        {invoiceTotalSummaryLabel}: {formatMoney(invoiceTotalWithMaxDiscount)}
                      </div>
                    </div>
                  )}

                  {hasMaxDiscount ? (
                    <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Discount is shown as a maximum based on the estimated invoice total. Total discount scales with employee count. Actual discount can be lower if some pairs price below the per Employee allowance.
                    </div>
                  ) : null}
                  {estimate.selectedEU === "Covered" ? (
                    <div className="mt-3 text-xs text-muted-foreground">Estimates show base allowance totals only.</div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">Total Estimate</div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{formatMoney(estimate.grandTotal)}</div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {continueBlockMessage ? (
                <div className="text-xs font-medium text-destructive">{continueBlockMessage}</div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={onClearAll} className={destructiveButtonClass}>
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={continueDisabled}
                  className={`${primaryButtonClass} ${continueDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  Continue To Quote Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export function ProgramCalculatorPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft, setCalculator, clear } = useProgramDraft();

  const builderGuidelines = draft.builder.guidelines;
  const allowanceScope = builderGuidelines.allowanceScope ?? "companywide";
  const isDepartmentBased = allowanceScope === "department_based";

  const departmentConfigs = useMemo(
    () => draft.calculator.departmentConfigs ?? [],
    [draft.calculator.departmentConfigs]
  );
  const departmentEstimateInputs = useMemo(() => {
    return departmentConfigs.map((row) => ({
      id: row.id,
      name: row.name,
      employeeCount: row.employeeCount,
      selections: row.selections,
    }));
  }, [departmentConfigs]);
  const departmentSummary = useMemo(
    () => summarizeDepartmentConfigs(departmentConfigs),
    [departmentConfigs]
  );
  const validDepartments = useMemo(
    () => departmentConfigs.filter((row) => row.name.trim() && clampInt(row.employeeCount) > 0),
    [departmentConfigs]
  );
  const hasTwoValidDepartments = !isDepartmentBased || validDepartments.length >= 2;
  const eligibleEmployees = draft.calculator.eligibleEmployees;
  const selectedEU = draft.calculator.selectedEU;
  const selectedTier = draft.calculator.selectedTier;

  const paymentTerms = draft.calculator.paymentTerms;
  const paymentDiscount = draft.calculator.paymentDiscount;

  const addOns = draft.calculator.addOns;
  const locations = draft.calculator.locations;
  const deferredLocations = useDeferredValue(locations);
  const deferredEligibleEmployees = useDeferredValue(eligibleEmployees);
  const deferredAddOns = useDeferredValue(addOns);
  const deferredPaymentTerms = useDeferredValue(paymentTerms);
  const deferredPaymentDiscount = useDeferredValue(paymentDiscount);
  const deferredSelectedEU = useDeferredValue(selectedEU);
  const deferredSelectedTier = useDeferredValue(selectedTier);
  const deferredDepartmentEstimateInputs = useDeferredValue(departmentEstimateInputs);

  const [showEUPackageInfo, setShowEUPackageInfo] = useState(false);
  const [showServiceTierInfo, setShowServiceTierInfo] = useState(false);

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
  const destructiveButtonClass =
    "inline-flex items-center justify-center rounded-lg bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
  const sectionTitleClass = "text-2xl font-semibold tracking-tight text-foreground";
  const sectionSubtextClass = "text-sm text-muted-foreground leading-relaxed";
  const restrictedEuAddOns = useMemo(() => {
    const ctx = { restrictions: builderGuidelines.restrictions };
    return Object.entries(draft.calculator.addOns.euPackageAddOns)
      .filter(([k, v]) => v && isOptionRestricted(ctx, "euAddOn", k as EUPackageAddOnKey))
      .map(([k]) => k as EUPackageAddOnKey);
  }, [builderGuidelines.restrictions, draft.calculator.addOns.euPackageAddOns]);
  const deptNameRef = useRef<Record<string, string>>({});
  const deptEmployeesRef = useRef<Record<string, string>>({});
  const deptRows = departmentConfigs;

  useEffect(() => {
    deptRows.forEach((r) => {
      if (deptNameRef.current[r.id] == null) {
        deptNameRef.current[r.id] = r.name ?? "";
      }
      if (deptEmployeesRef.current[r.id] == null) {
        deptEmployeesRef.current[r.id] = String(r.employeeCount ?? 0);
      }
    });
  }, [deptRows]);

  function setField<K extends keyof typeof draft.calculator>(key: K, value: (typeof draft.calculator)[K]) {
    setCalculator((prev) => ({ ...prev, [key]: value }));
  }

  function updateLocation(idx: number, patch: Partial<LocationRow>) {
    setCalculator((prev) => ({
      ...prev,
      locations: prev.locations.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  }

  function setAddOnsPatch(patch: Partial<AddOns>) {
    setCalculator((prev) => ({ ...prev, addOns: { ...prev.addOns, ...patch } }));
  }

  const addDepartmentRow = useCallback(() => {
    setCalculator((prev) => ({
      ...prev,
      departmentConfigs: [...(prev.departmentConfigs ?? []), makeDepartmentConfigRow()],
    }));
  }, [setCalculator]);

  const updateDepartmentRow = useCallback((id: string, patch: Partial<DepartmentConfigRow>) => {
    setCalculator((prev) => ({
      ...prev,
      departmentConfigs: (prev.departmentConfigs ?? []).map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  }, [setCalculator]);

  const toggleDepartmentAddOn = useCallback((rowId: string, key: EUPackageAddOnKey, next: boolean) => {
    setCalculator((prev) => ({
      ...prev,
      departmentConfigs: (prev.departmentConfigs ?? []).map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          selections: {
            ...row.selections,
            euPackageAddOns: {
              ...row.selections.euPackageAddOns,
              [key]: next,
            },
          },
        };
      }),
    }));
  }, [setCalculator]);

  const removeDepartmentRow = useCallback((id: string) => {
    setCalculator((prev) => ({
      ...prev,
      departmentConfigs: (prev.departmentConfigs ?? []).filter((row) => row.id !== id),
    }));
  }, [setCalculator]);

  const onDepartmentNameInput = useCallback((id: string, next: string) => {
    deptNameRef.current[id] = next;
  }, []);

  const onDepartmentNameCommit = useCallback((id: string) => {
    const committed = deptNameRef.current[id] ?? "";
    updateDepartmentRow(id, { name: committed });
  }, [updateDepartmentRow]);

  const getDepartmentNameValue = useCallback((row: DepartmentConfigRow) => {
    return deptNameRef.current[row.id] ?? row.name ?? "";
  }, []);

  const onDepartmentEmployeeCountInput = useCallback((id: string, next: string) => {
    deptEmployeesRef.current[id] = next;
  }, []);

  const onDepartmentEmployeeCountCommit = useCallback((id: string) => {
    const raw = deptEmployeesRef.current[id] ?? "0";
    const num = Number(raw);
    const employeeCount = Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
    updateDepartmentRow(id, { employeeCount });
    const normalized = String(employeeCount);
    deptEmployeesRef.current[id] = normalized;
    return normalized;
  }, [updateDepartmentRow]);

  const getDepartmentEmployeeCountValue = useCallback((row: DepartmentConfigRow) => {
    return deptEmployeesRef.current[row.id] ?? String(row.employeeCount ?? 0);
  }, []);

  const onDepartmentRemove = useCallback((id: string) => {
    removeDepartmentRow(id);
    delete deptNameRef.current[id];
    delete deptEmployeesRef.current[id];
  }, [removeDepartmentRow]);

  function clearProgramInputs() {
    setCalculator((prev) => ({
      ...prev,
      eligibleEmployees: 1,
      selectedEU: "Compliance",
      selectedTier: "Essential",
      departmentAllowances: [],
      departmentConfigs: isDepartmentBased ? [makeDepartmentConfigRow(), makeDepartmentConfigRow()] : [],
      addOns: { ...prev.addOns, extraSiteVisits: 0 },
    }));
  }

  function clearEUPackageAddOns() {
    setCalculator((prev) => ({
      ...prev,
      addOns: {
        ...prev.addOns,
        euPackageAddOns: {
          polarized: false,
          antiFog: false,
          antiReflectiveStd: false,
          blueLightAntiReflective: false,
          tint: false,
          transitions: false,
          transitionsPolarized: false,
          extraScratchCoating: false,
        },
      },
    }));
  }

  const debounceTimersRef = useRef<Record<number, number>>({});
  const distanceRequestIdRef = useRef<Record<number, number>>({});
  const addressCacheRef = useRef<Map<string, { miles: number; minutes: number }>>(new Map());
  const showroomCoordsRef = useRef<LatLon | null>(null);

  function clearDistanceTimersAndCache() {
    const timers = debounceTimersRef.current;
    Object.keys(timers).forEach((k) => {
      const id = timers[Number(k)];
      if (id) window.clearTimeout(id);
    });
    debounceTimersRef.current = {};
    distanceRequestIdRef.current = {};
    addressCacheRef.current.clear();
  }

  function clearLocations() {
    clearDistanceTimersAndCache();
    setCalculator((prev) => ({ ...prev, locations: makeDefaultLocations() }));
  }

  const clearAllCalculator = useCallback(() => {
    clearDistanceTimersAndCache();
    clear.calculator();
  }, [clear]);

  useEffect(() => {
    if (restrictedEuAddOns.length === 0) return;

    setCalculator((prev) => ({
      ...prev,
      addOns: {
        ...prev.addOns,
        euPackageAddOns: {
          ...prev.addOns.euPackageAddOns,
          ...Object.fromEntries(restrictedEuAddOns.map((k) => [k, false])),
        },
      },
    }));
  }, [restrictedEuAddOns, setCalculator]);

  function addLocation() {
    setCalculator((prev) => {
      const nextLabel = `Location ${prev.locations.length + 1}`;
        const status = "Enter street, city, and state to calculate distance. You can enter miles manually at any time.";

        return {
          ...prev,
          locations: [
            ...prev.locations,
            {
              label: nextLabel,
              streetAddress: "",
              city: "",
              state: "",
              zipCode: "",
              oneWayMiles: 0,
              oneWayMinutes: 0,
              autoDistance: true,
              status: "idle",
              statusMessage: status,
            },
          ],
        };
    });
  }

  function removeLocation(idx: number) {
    setCalculator((prev) => {
      if (prev.locations.length <= 1) return prev;
      const next = prev.locations.filter((_, i) => i !== idx);
      return {
        ...prev,
        locations: next.map((r, i) => ({ ...r, label: `Location ${i + 1}` })),
      };
    });
  }

  async function getShowroomCoords(): Promise<LatLon> {
    if (showroomCoordsRef.current) return showroomCoordsRef.current;

    const pseudoLoc = {
      streetAddress: "6780 Miramar Rd",
      city: "San Diego",
      state: "CA",
      zipCode: "92121",
    };

    const coords = await geocodeWithNominatim(pseudoLoc);
    showroomCoordsRef.current = coords;
    return coords;
  }

  function setIdleMessage(idx: number, loc: LocationRow) {
    const ready = isAddressCompleteEnough(loc);
    updateLocation(idx, {
      status: "idle",
      statusMessage: ready
        ? "Auto distance is calculated using map routing estimates. If you have a verified shorter route, switch to manual and enter one-way miles."
        : "Enter street, city, and state to calculate distance. You can enter miles manually at any time.",
    });
  }

  function runDistanceLookup(idx: number, loc: LocationRow) {
    if (!loc.autoDistance) return;

    if (!isAddressCompleteEnough(loc)) {
      updateLocation(idx, {
        status: "idle",
        statusMessage: "Enter street, city, and state to calculate distance. You can enter miles manually at any time.",
      });
      return;
    }

    const cacheKey = normalizeAddressKey(loc);
    const cached = addressCacheRef.current.get(cacheKey);
    if (cached) {
      const normalizedCachedMiles = normalizeAutoOneWayMiles(cached.miles);
      updateLocation(idx, {
        status: "idle",
        statusMessage:
          "Auto distance is calculated using map routing estimates. If you have a verified shorter route, switch to manual and enter one-way miles.",
        oneWayMiles: normalizedCachedMiles,
        oneWayMinutes: cached.minutes,
      });
      return;
    }

    updateLocation(idx, { status: "routing", statusMessage: "Calculating driving distanceâ€¦" });

    const timers = debounceTimersRef.current;
    if (timers[idx]) window.clearTimeout(timers[idx]);

    const nextReqId = (distanceRequestIdRef.current[idx] ?? 0) + 1;
    distanceRequestIdRef.current[idx] = nextReqId;

    timers[idx] = window.setTimeout(async () => {
      try {
        const origin = await getShowroomCoords();
        const destination = await geocodeWithNominatim(loc);
        const routed = await routeWithOSRM(origin, destination);

        if ((distanceRequestIdRef.current[idx] ?? 0) !== nextReqId) return;

        const normalizedMiles = normalizeAutoOneWayMiles(routed.miles);
        addressCacheRef.current.set(cacheKey, { miles: normalizedMiles, minutes: routed.minutes });

        updateLocation(idx, {
          status: "idle",
          statusMessage:
            "Auto distance is calculated using map routing estimates. If you have a verified shorter route, switch to manual and enter one-way miles.",
          oneWayMiles: normalizedMiles,
          oneWayMinutes: routed.minutes,
        });
      } catch (err: unknown) {
        if ((distanceRequestIdRef.current[idx] ?? 0) !== nextReqId) return;

        const msg = err instanceof Error ? err.message : "Distance lookup failed.";
        updateLocation(idx, { status: "error", statusMessage: `${msg} You can enter one way miles manually.` });
      }
    }, 800) as unknown as number;
  }

  function onChangeLocationField(
    idx: number,
    patch: Partial<Pick<LocationRow, "streetAddress" | "city" | "state" | "zipCode">>
  ) {
    setCalculator((prev) => {
      const next = prev.locations.map((row, i) => (i === idx ? { ...row, ...patch } : row));
      const row = next[idx];
      const auto = row?.autoDistance ?? true;

      if (auto) {
        setIdleMessage(idx, row);
        runDistanceLookup(idx, row);
      }

      return { ...prev, locations: next };
    });
  }

  function toggleAutoDistance(idx: number, next: boolean) {
    setCalculator((prev) => {
      const row = prev.locations[idx];
      if (!row) return prev;

      const updated: LocationRow = {
        ...row,
        autoDistance: next,
        status: "idle",
        statusMessage: next
          ? "Enter street, city, and state to calculate distance. You can enter miles manually at any time."
          : "Manual miles on. Enter one way miles directly.",
      };

      const out = prev.locations.map((r, i) => (i === idx ? updated : r));

      if (next) {
        setIdleMessage(idx, updated);
        runDistanceLookup(idx, updated);
      }

      return { ...prev, locations: out };
    });
  }

  const estimate = useMemo<EstimateModel>(() => {
    const employeesRaw = deferredEligibleEmployees === "" ? 0 : deferredEligibleEmployees;
    const employeesDefault = clampInt(employeesRaw);

    const safeSelectedEU: EUPackage = deferredSelectedEU ? (deferredSelectedEU as EUPackage) : "Compliance";
    const safeSelectedTier: ServiceTier = deferredSelectedTier ? (deferredSelectedTier as ServiceTier) : "Essential";
    const baseEUAllowance = PRICING.euAllowancePerEmployee[safeSelectedEU];

    const includeAddOnsInAllowance = includeEuAddOnsInAllowance();

    let totalDepartmentEmployees = 0;
    let allowanceTotal = 0;
    const departmentBreakdown: EstimateDepartmentLine[] = [];

    if (isDepartmentBased) {
      let departmentIndex = 0;
      for (const row of deferredDepartmentEstimateInputs) {
        departmentIndex += 1;
        const details = departmentAllowanceSubtotal(row, baseEUAllowance, includeAddOnsInAllowance);
        totalDepartmentEmployees += details.employees;
        allowanceTotal += details.allowanceSubtotal;
        departmentBreakdown.push({
          id: row.id,
          departmentName: row.name.trim() || `D${departmentIndex}`,
          employeeCount: details.employees,
          allowancePerEmployee: details.allowancePerEmployee,
          allowanceTotal: details.allowanceSubtotal,
          selectedAddOnsLabels: details.selectedAddOnsLabels,
        });
      }
    }

    const employees = isDepartmentBased ? totalDepartmentEmployees : employeesDefault;

    const onboardingBase = PRICING.onboardingFeeSingleSiteStandard;
    const additionalSitesCount = Math.max(0, deferredLocations.length - 1);
    const onboardingAdditionalSitesFeePerSite = PRICING.onboardingFeeAdditionalSite;
    const onboardingAdditionalSitesTotal = additionalSitesCount * onboardingAdditionalSitesFeePerSite;
    const onboardingFee = onboardingBase + onboardingAdditionalSitesTotal;

    const includedVisits = PRICING.standardVisitsByTier[safeSelectedTier];

    const extraVisitsRaw = deferredAddOns.extraSiteVisits === "" ? 0 : deferredAddOns.extraSiteVisits;
    const extraVisits = clampInt(extraVisitsRaw);
    const totalVisits = includedVisits + extraVisits;
    const extraVisitsFee = extraVisits * PRICING.extraSiteVisitFee;

    const euPackageAddOnsPerEmployeeGlobal = EU_PACKAGE_ADD_ON_ITEMS.reduce((sum, item) => {
      return sum + (deferredAddOns.euPackageAddOns[item.key] ? item.amount : 0);
    }, 0);


    const euBaseAllowance = baseEUAllowance;
    const coveredExampleAntiFogPerEmployee = PRICING.euPackageAddOnsPerEmployee.antiFog;
    const coveredExampleAntiReflectivePerEmployee = PRICING.euPackageAddOnsPerEmployee.antiReflectiveStd;
    const coveredExampleTintPerEmployee = PRICING.euPackageAddOnsPerEmployee.tint;
    const coveredSelectedAddOns = EU_PACKAGE_ADD_ON_ITEMS.filter((item) => deferredAddOns.euPackageAddOns[item.key]);
    const coveredSelectedAddOnsLabels = coveredSelectedAddOns.map(
      (item) => `${item.label} ${formatMoney(item.amount)}`
    );
    const coveredAllAddOnsPerEmployee = EU_PACKAGE_ADD_ON_ITEMS.reduce((sum, item) => sum + item.amount, 0);
    const coveredExampleFloorPerEmployee = safeSelectedEU === "Covered" ? euBaseAllowance : 0;
    const coveredExampleFloorTotal = coveredExampleFloorPerEmployee * employees;
    const coveredExampleCeilingPerEmployee =
      safeSelectedEU === "Covered" ? coveredExampleFloorPerEmployee + coveredAllAddOnsPerEmployee : 0;
    const coveredExampleCeilingTotal = coveredExampleCeilingPerEmployee * employees;
    const coveredExampleCombinationPerEmployee =
      safeSelectedEU === "Covered" ? coveredExampleFloorPerEmployee + euPackageAddOnsPerEmployeeGlobal : 0;
    const coveredExampleCombinationTotal = coveredExampleCombinationPerEmployee * employees;

    let allowancePerEmployee: number;
    let computedAllowanceTotal = allowanceTotal;
    let euPackageAddOnsPerEmployee = euPackageAddOnsPerEmployeeGlobal;

    if (isDepartmentBased) {
      allowancePerEmployee = employees > 0 ? computedAllowanceTotal / Math.max(1, employees) : 0;
      euPackageAddOnsPerEmployee = 0;
    } else {
      const allowance = calculateCompanywideAllowance({
        baseEUAllowance: euBaseAllowance,
        euPackageAddOnsPerEmployee: euPackageAddOnsPerEmployeeGlobal,
        employees,
      });
      allowancePerEmployee = allowance.allowancePerEmployee;
      computedAllowanceTotal = allowance.allowanceTotal;
    }

    const tierBaseServicePerEmployee = PRICING.serviceFeePerEmployee[safeSelectedTier];
    const servicePerEmployee = tierBaseServicePerEmployee;
    const serviceTotal = tierBaseServicePerEmployee * employees;

    const validMiles = deferredLocations
      .map((l) => clampNumber(l.oneWayMiles))
      .filter((miles) => miles > 0);

    const minOneWayMiles = validMiles.length ? Math.min(...validMiles) : 0;

    const travelPricing = travelMath(minOneWayMiles, totalVisits);
    const travelTotal = travelPricing.total;

    const travelByLocation = deferredLocations.map((loc) => {
      const tm = travelMath(loc.oneWayMiles, totalVisits);

      return {
        label: loc.label,
        address: formatLocationAddress(loc),
        oneWayMiles: tm.oneWay,
        includedVisits,
        extraVisits,
        totalVisits,
        billableRoundTripMiles: tm.billableRoundTripMiles,
        feePerVisit: tm.feePerVisit,
        total: tm.total,
      };
    });

    const subtotal = onboardingFee + computedAllowanceTotal + serviceTotal + extraVisitsFee + travelTotal;

    const financeFeePerInvoice = PRICING.financeFeesPerInvoice[deferredPaymentTerms];
    const financeFeeTotal = financeFeePerInvoice * employees;

    const discountAllowed = deferredPaymentTerms === "NET30";
    const discountPct = discountAllowed ? PRICING.paymentDiscounts[deferredPaymentDiscount] : 0;

    const invoicePerEmployee = allowancePerEmployee + servicePerEmployee;
    const invoiceTotal = invoicePerEmployee * employees;

    const discountPerEmployeeMax = invoicePerEmployee * discountPct;
    const discountTotalMax = invoiceTotal * discountPct;

    const grandTotal = subtotal - discountTotalMax + financeFeeTotal;

    return {
      employees,

      onboardingBase,
      additionalSitesCount,
      onboardingAdditionalSitesFeePerSite,
      onboardingAdditionalSitesTotal,
      onboardingFee,

      selectedEU: safeSelectedEU,
      selectedTier: safeSelectedTier,

      euBaseAllowance,
      euPackageAddOnsPerEmployee,
      coveredExampleFloorPerEmployee,
      coveredExampleFloorTotal,
      coveredExampleCeilingPerEmployee,
      coveredExampleCeilingTotal,
      coveredExampleAntiFogPerEmployee,
      coveredExampleAntiReflectivePerEmployee,
      coveredExampleTintPerEmployee,
      coveredSelectedAddOnsLabels,
      coveredExampleCombinationPerEmployee,
      coveredExampleCombinationTotal,

      allowancePerEmployee,
      allowanceTotal: computedAllowanceTotal,

      tierBaseServicePerEmployee,
      servicePerEmployee,
      serviceTotal,

      includedVisits,
      extraVisits,
      totalVisits,
      extraVisitsFee,

      travelByLocation,
      travelTotal,

      subtotal,

      paymentTerms: deferredPaymentTerms,
      financeFeePerInvoice,
      financeFeeTotal,

      paymentDiscount: deferredPaymentDiscount,
      discountPct,

      invoicePerEmployee,
      invoiceTotal,
      discountPerEmployeeMax,
      discountTotalMax,

      grandTotal,
      isDepartmentBased,
      departmentBreakdown,
    };
  }, [
    deferredEligibleEmployees,
    deferredSelectedEU,
    deferredSelectedTier,
    deferredAddOns,
    deferredLocations,
    deferredPaymentTerms,
    deferredPaymentDiscount,
    isDepartmentBased,
    deferredDepartmentEstimateInputs,
    builderGuidelines,
  ]);

  const visibleDepartmentEuAddOnItems = useMemo(
    () => EU_PACKAGE_ADD_ON_ITEMS.filter((item) => isOptionVisible(builderGuidelines, "euAddOn", item.key)),
    [builderGuidelines]
  );

  const travelExplanation = useMemo(() => {
    const included = PRICING.travel.includedOneWayMiles;
    const rate = PRICING.travel.dollarsPerMileOver;
    return `Miles up to ${included} one way are included. Miles beyond ${included} are billed round trip, at ${formatMoney(
      rate
    )} per mile, for each onsite visit. Total travel surcharge is the per Visit amount times your total visits.`;
  }, []);

  useEffect(() => {
    return () => {
      clearDistanceTimersAndCache();
    };
  }, []);

  useEffect(() => {
    if (!showEUPackageInfo && !showServiceTierInfo) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowEUPackageInfo(false);
      setShowServiceTierInfo(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showEUPackageInfo, showServiceTierInfo]);

  const departmentConfigsEditor = (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Departments</div>
          <div className="text-xs text-muted-foreground">
            Add departments, headcount, and pick EU add ons per department.
          </div>
        </div>

        <button type="button" onClick={addDepartmentRow} className={secondaryButtonClass}>
          Add Department
        </button>
      </div>

      <div className="space-y-4">
        {departmentConfigs.length ? (
          departmentConfigs.map((row) => (
            <div key={row.id}>
              <DepartmentRowEditor
                row={row}
                canRemove={departmentConfigs.length > 1}
                secondaryButtonClass={secondaryButtonClass}
                visibleEuAddOnItems={visibleDepartmentEuAddOnItems}
                onNameInput={onDepartmentNameInput}
                onNameCommit={onDepartmentNameCommit}
                getNameValue={getDepartmentNameValue}
                onEmployeeCountInput={onDepartmentEmployeeCountInput}
                onEmployeeCountCommit={onDepartmentEmployeeCountCommit}
                getEmployeeCountValue={getDepartmentEmployeeCountValue}
                onRemove={onDepartmentRemove}
                onToggleAddOn={toggleDepartmentAddOn}
              />
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            No departments added yet. Add at least two departments with an employee count greater than 0.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div>
          Departments: <span className="font-medium text-foreground">{departmentConfigs.length}</span>
        </div>
        <div>
          Total employees: <span className="font-medium text-foreground">{departmentSummary.totalEmployees}</span>
        </div>
      </div>

      {!hasTwoValidDepartments ? (
        <div className="text-xs font-semibold text-destructive">
          Add at least two departments with an employee count greater than 0.
        </div>
      ) : null}
    </div>
  );

  const discountDisabled = paymentTerms !== "NET30";
  const continueDisabled =
    !selectedEU ||
    !selectedTier ||
    (isDepartmentBased ? !hasTwoValidDepartments : false) ||
    (!isDepartmentBased && (!eligibleEmployees || eligibleEmployees <= 0)) ||
    (!locations.length || !locations[0].streetAddress.trim());

  const continueBlockMessage = !selectedEU
    ? "Select an EU package to continue."
    : !selectedTier
      ? "Select a service tier to continue."
      : isDepartmentBased && !hasTwoValidDepartments
          ? "Add at least two departments with an employee count greater than 0 to continue."
          : !isDepartmentBased && (!eligibleEmployees || eligibleEmployees <= 0)
            ? "Enter eligible employees to continue."
            : !locations.length || !locations[0].streetAddress.trim()
              ? "Add at least one location to continue."
              : "";
  const onClearAll = clearAllCalculator;
  const onContinueToQuote = useCallback(() => {
    onNavigate("quote", "calculator_continue");
  }, [onNavigate]);

  return (
    <section aria-labelledby="calculator-title">
      <PageHero
        id="calculator-title"
        title="Program Calculator"
        subtitle="Calculate estimated pricing based on headcount, EU package allowance, service tier, visits, and travel surcharge."
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <SectionWrap>

          {showEUPackageInfo ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 sm:p-6"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowEUPackageInfo(false);
              }}
            >
              <div className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-foreground">EU Package</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Package definitions and what each package includes.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEUPackageInfo(false)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 overflow-y-auto pr-1 sm:mt-6 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Compliance Overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Compliance is the simplest way to deliver a consistent, safety ready standard across the workforce. It is designed for programs that want clear rules, predictable eligibility, and fast decision making when questions come up.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This package works well when you want a stable baseline that meets requirements, keeps administration simple, and reduces exceptions while still delivering comfortable, compliant eyewear employees will actually wear.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s Included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Core safety frame access: B1</li>
                      <li>Single vision and PAL A designs</li>
                      <li>Polycarbonate lenses</li>
                      <li>Standard safety build options</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Comfort Overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Comfort is built for adoption. It expands selection so more employees can find a fit they like, which increases consistent wear and improves real world protection.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This package is a strong fit when participation is a key goal and you want the program to feel employee friendly while keeping the rules straightforward and easy to manage.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s Included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Everything in Compliance, with expanded frame choice</li>
                      <li>Adds E2, D3, and P4 frames</li>
                      <li>Single vision and PAL A designs</li>
                      <li>Polycarbonate lenses</li>
                      <li>Broader day to day wear coverage</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Complete Overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Complete supports broader job conditions and more demanding roles where performance features and prescription flexibility matter.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      It is a common fit when you have a wider mix of environments and a wider range of prescriptions, including progressive and higher cylinder prescriptions that benefit from added design options to perform well on the job.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s Included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Everything in Comfort, with extended performance range</li>
                      <li>Adds WP frames</li>
                      <li>Single vision plus PAL A, PAL B, and PAL C designs</li>
                      <li>Polycarbonate lenses</li>
                      <li>Greater flexibility across roles and conditions</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Covered Overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Covered is the most configurable end user package. It is designed for organizations with multiple locations, multiple job functions, and varied operating conditions.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      Instead of forcing one standard across every role, you can define coverage rules by job type or site so employees get what they need without ongoing one off exceptions. The result is a cleaner employee experience and fewer administrative bottlenecks.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s Included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Everything in Complete, fully customized by role and site</li>
                      <li>Customized frame access</li>
                      <li>Customized lens designs and materials</li>
                      <li>Coatings, options, and rules configured by role or site</li>
                      <li>Configured to match complex environments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showServiceTierInfo ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 sm:p-6"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowServiceTierInfo(false);
              }}
            >
              <div className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-foreground">Service Tier</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Service tier definitions and what each tier includes.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowServiceTierInfo(false)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 overflow-y-auto pr-1 sm:mt-6 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Essential overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Essential establishes a dependable operating rhythm. It provides planned onsite coverage, simple fulfillment, and support systems that keep the program running without heavy internal coordination.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This tier is a strong fit when you want a reliable cadence for employees and a straightforward way to integrate new hires as the workforce changes.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>2 onsite fitting visits</li>
                      <li>Additional visits available as needed</li>
                      <li>2 bulk shipments</li>
                      <li>Online registration and scheduling</li>
                      <li>Digital program materials</li>
                      <li>In person office services</li>
                      <li>OSSO help support</li>
                      <li>30 day RightPair guarantee</li>
                      <li>1 year limited frame warranty</li>
                      <li>Single annual program report</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Access overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Access is designed for growth. It increases cadence so the program keeps up with steady hiring, shifting headcount, and the operational reality of teams that change month to month.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This tier reduces gaps in coverage, improves throughput, and makes the program feel consistently available, which supports adoption and reduces last minute escalations.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>All Essential capabilities, expanded to</li>
                      <li>6 onsite fitting visits</li>
                      <li>6 bulk shipments</li>
                      <li>Optional approval workflow</li>
                      <li>Print program materials</li>
                      <li>Onsite troubleshooting support</li>
                      <li>45 day RightPair guarantee</li>
                      <li>Up to 6 program reports</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Premier overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Premier is built for consistency at scale. It adds a stronger operating structure, higher cadence, and a reporting rhythm that makes program performance easier to manage across teams and sites.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This tier is a strong fit when you want fewer internal status checks, clearer visibility into participation and fulfillment, and a more managed experience for employees and program owners.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Everything in Access, with enhanced structure</li>
                      <li>12 onsite fitting visits + delivery services</li>
                      <li>Monthly automated reporting</li>
                      <li>90 day RightPair guarantee</li>
                      <li>Dedicated company program hub</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">Enterprise overview</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Enterprise is designed for high volume and operational complexity. It adds dedicated oversight and deeper partnership support to keep execution tight across locations, stakeholders, and changing workforce needs.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      This tier is ideal when you want a long term partner to manage performance, reduce operational friction, and keep employees supported across a larger footprint.
                    </p>
                    <div className="mt-4 text-xs font-semibold text-foreground">What&apos;s included</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>Everything in Premier, with enterprise level support</li>
                      <li>12 to 24 onsite fitting visits + delivery services</li>
                      <li>Custom reporting by request</li>
                      <li>Program success specialist</li>
                      <li>Assigned OSSO optician</li>
                      <li>180 day extended frame warranty</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate("builder", "internal")}
              className={secondaryButtonClass}
            >
              Back To Program Builder
            </button>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={onContinueToQuote}
                disabled={continueDisabled}
                className={`${primaryButtonClass} ${continueDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                Continue To Quote Preview
              </button>
              {continueBlockMessage ? (
                <div className="text-xs font-medium text-destructive">{continueBlockMessage}</div>
              ) : null}
            </div>
          </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="space-y-10">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h2 className={sectionTitleClass}>Program Inputs</h2>
                    <p className={sectionSubtextClass}>
                      These inputs drive EU package allowance, service tier fees, additional onsite visit fees, travel surcharge, and payment terms.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setShowEUPackageInfo(true)}
                            className="inline-flex items-center rounded-md border border-border bg-secondary/30 px-2 py-1 text-sm font-semibold text-foreground hover:bg-secondary"
                          >
                            EU Package
                          </button>
                        </div>
                        <select
                          value={selectedEU}
                          onChange={(e) => setField("selectedEU", e.target.value as EUPackage | "")}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                        >
                          <option value="">Select EU Package</option>
                          <option value="Compliance">Compliance</option>
                          <option value="Comfort">Comfort</option>
                          <option value="Complete">Complete</option>
                          <option value="Covered">Covered</option>
                        </select>
                        {selectedEU === "Covered" ? (
                          <div className="text-xs text-muted-foreground">Covered includes all EU Package add ons.</div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowServiceTierInfo(true)}
                          className="inline-flex items-center rounded-md border border-border bg-secondary/30 px-2 py-1 text-sm font-semibold text-foreground hover:bg-secondary"
                        >
                          Service Tier
                        </button>
                        <select
                          value={selectedTier}
                          onChange={(e) => setField("selectedTier", e.target.value as ServiceTier | "")}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                        >
                          <option value="">Select Service Tier</option>
                          <option value="Essential">Essential</option>
                          <option value="Access">Access</option>
                          <option value="Premier">Premier</option>
                          <option value="Enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>

                    {isDepartmentBased ? (
                      departmentConfigsEditor
                    ) : (
                      <label className="space-y-2">
                        <div className="text-sm font-medium text-foreground">Estimated Eligible Employees</div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={eligibleEmployees}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") setField("eligibleEmployees", "");
                            else setField("eligibleEmployees", Number(v));
                          }}
                          onBlur={() => {
                            if (draft.calculator.eligibleEmployees === "" || draft.calculator.eligibleEmployees === 0) {
                              setField("eligibleEmployees", 1);
                            }
                          }}
                          className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                          placeholder="1"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={clearProgramInputs} className={secondaryButtonClass}>
                      Clear Program Inputs
                    </button>
                  </div>
                </div>

                {!isDepartmentBased ? (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h2 className={sectionTitleClass}>EU Package Add Ons</h2>
                        <p className={sectionSubtextClass}>Optional per Employee EU add ons.</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {EU_PACKAGE_ADD_ON_ITEMS.map((item) => {
                          const isRestricted = isOptionRestricted(builderGuidelines, "euAddOn", item.key);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-start gap-3 rounded-md border border-border bg-card p-3 ${
                                isRestricted ? "opacity-70" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={addOns.euPackageAddOns[item.key]}
                                onChange={(e) =>
                                  setAddOnsPatch({
                                    euPackageAddOns: { ...addOns.euPackageAddOns, [item.key]: e.target.checked },
                                  })
                                }
                                disabled={isRestricted}
                                className="mt-1"
                              />
                              <div className="space-y-1">
                                <div className="text-sm text-foreground">
                                  {item.label}{" "}
                                  <span className="text-muted-foreground">({formatMoney(item.amount)} per Employee)</span>
                                  {isRestricted ? (
                                    <span className="ml-2 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                      Restricted
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">{EU_ADD_ON_DESCRIPTIONS[item.key]}</div>
                                {isRestricted ? (
                                  <div className="text-xs text-muted-foreground">
                                    Available only with documented medical necessity and case-by-case approval.
                                  </div>
                                ) : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex justify-end">
                        <button type="button" onClick={clearEUPackageAddOns} className={secondaryButtonClass}>
                          Clear EU Add Ons
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Non Prescription Custom Safety Glasses</div>
                      <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                        <input
                          type="checkbox"
                          checked={addOns.nonPrescriptionCustomSafetyGlasses}
                          onChange={(e) => setAddOnsPatch({ nonPrescriptionCustomSafetyGlasses: e.target.checked })}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="text-sm text-foreground">Allow non prescription custom safety glasses</div>
                          <div className="text-xs text-muted-foreground">No pricing impact in this calculator.</div>
                        </div>
                      </label>
                    </div>
                  </>
                ) : null}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className={sectionTitleClass}>Locations And Visits</h2>
                    <p className={sectionSubtextClass}>{travelExplanation}</p>
                  </div>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Additional Onsite Visits</div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={addOns.extraSiteVisits}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddOnsPatch({
                          extraSiteVisits: v === "" ? "" : clampInt(Number(v)),
                        });
                      }}
                      onBlur={() => {
                        setAddOnsPatch({
                          extraSiteVisits:
                            draft.calculator.addOns.extraSiteVisits === "" ? 0 : draft.calculator.addOns.extraSiteVisits,
                        });
                      }}
                      className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                      placeholder="0"
                    />
                    <div className="text-xs text-muted-foreground">
                      Adds {formatMoney(PRICING.extraSiteVisitFee)} per Visit. Travel is calculated per Visit, so travel surcharge increases as visits increase.
                    </div>
                  </label>

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="text-sm font-semibold text-foreground">Showroom Reference</div>
                    <div className="mt-1 text-sm text-muted-foreground">{SHOWROOM_ADDRESS}</div>
                  </div>

                  <div className="space-y-3">
                    {locations.map((loc, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">{loc.label}</div>
                            <div className="text-xs text-muted-foreground">{loc.statusMessage}</div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={loc.autoDistance}
                                onChange={(e) => toggleAutoDistance(idx, e.target.checked)}
                              />
                              Auto Distance
                            </label>

                            {locations.length > 1 ? (
                              <button type="button" onClick={() => removeLocation(idx)} className={secondaryButtonClass}>
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="space-y-2">
                            <div className="text-sm font-medium text-foreground">Street Address</div>
                            <input
                              value={loc.streetAddress}
                              onChange={(e) => onChangeLocationField(idx, { streetAddress: e.target.value })}
                              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                              placeholder="Street address"
                            />
                          </label>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="space-y-2 sm:col-span-1">
                              <div className="text-sm font-medium text-foreground">City</div>
                              <input
                                value={loc.city}
                                onChange={(e) => onChangeLocationField(idx, { city: e.target.value })}
                                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                                placeholder="City"
                              />
                            </label>

                            <label className="space-y-2 sm:col-span-1">
                              <div className="text-sm font-medium text-foreground">State</div>
                              <input
                                value={loc.state}
                                onChange={(e) => onChangeLocationField(idx, { state: e.target.value })}
                                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                                placeholder="State"
                              />
                            </label>

                            <label className="space-y-2 sm:col-span-1">
                              <div className="text-sm font-medium text-foreground">ZIP</div>
                              <input
                                value={loc.zipCode}
                                onChange={(e) => onChangeLocationField(idx, { zipCode: e.target.value })}
                                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                                placeholder="ZIP"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="space-y-2">
                            <div className="text-sm font-medium text-foreground">One Way Miles</div>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={loc.oneWayMiles}
                              disabled={loc.autoDistance && loc.status !== "error"}
                              onChange={(e) =>
                                updateLocation(idx, {
                                  oneWayMiles: clampNumber(Number(e.target.value)),
                                  status: "idle",
                                  statusMessage: "Manual miles entered. Travel surcharge will use this value.",
                                })
                              }
                              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                              placeholder="0"
                            />
                          </label>

                          <div className="text-xs text-muted-foreground leading-relaxed sm:self-end">
                            <div>Miles up to {PRICING.travel.includedOneWayMiles} one way are included.</div>
                            <div className="mt-1">
                              Miles Over 50 (One Way):{" "}
                              <span className="font-medium text-foreground">{formatMiles(milesOverIncludedOneWay(loc.oneWayMiles))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={addLocation} className={secondaryButtonClass}>
                        Add Another Location
                      </button>

                      <button type="button" onClick={clearLocations} className={secondaryButtonClass}>
                        Clear Locations
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className={sectionTitleClass}>Payment Terms</h2>
                    <p className={sectionSubtextClass}>
                      Select your payment terms. Extended terms add a finance fee per Invoice. NET30 can include an early pay discount.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Terms</div>
                      <select
                        value={paymentTerms}
                        onChange={(e) => {
                          const next = e.target.value as PaymentTerms;
                          setField("paymentTerms", next);
                          if (next !== "NET30") setField("paymentDiscount", "none");
                        }}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                      >
                        <option value="NET30">NET30</option>
                        <option value="NET45">NET45 (+{formatMoney(PRICING.financeFeesPerInvoice.NET45)} per Invoice)</option>
                        <option value="NET60">NET60 (+{formatMoney(PRICING.financeFeesPerInvoice.NET60)} per Invoice)</option>
                        <option value="NET75">NET75 (+{formatMoney(PRICING.financeFeesPerInvoice.NET75)} per Invoice)</option>
                        <option value="NET90">NET90 (+{formatMoney(PRICING.financeFeesPerInvoice.NET90)} per Invoice)</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Early Pay Discount</div>
                      <select
                        value={paymentDiscount}
                        onChange={(e) => setField("paymentDiscount", e.target.value as PaymentDiscount)}
                        disabled={discountDisabled}
                        className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-transparent"
                      >
                        <option value="none">{discountLabel("none")}</option>
                        <option value="2_15_NET30">{discountLabel("2_15_NET30")}</option>
                        <option value="3_10_NET30">{discountLabel("3_10_NET30")}</option>
                      </select>
                      {discountDisabled ? <div className="text-xs text-muted-foreground">Discount options apply to NET30 only.</div> : null}
                    </label>
                  </div>

                  {paymentTerms === "NET30" && paymentDiscount !== "none" ? (
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Discount is shown as a maximum based on the estimated invoice total. Total discount scales with employee count. Actual discount can be lower if some pairs price below the per Employee allowance.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border border-border bg-card p-4">
                  <div className="text-sm font-semibold text-foreground">Estimate Notice</div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    This calculator provides an estimate. Final pricing and program scope are confirmed after On-Sight Safety Optics reviews your locations, onsite requirements, hazard and compliance needs, frame and lens requirements, travel distance, and support coverage.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Supplemental requests, including additional products, services, reporting, special handling, or policy exceptions, are scoped and priced separately. For coverage, timelines, and total cost, review the estimate with an OSSO Program Specialist before treating it as final.
                  </p>
                </div>
              </div>
            </div>

            <EstimateBreakdown
              estimate={estimate}
              travelExplanation={travelExplanation}
              destructiveButtonClass={destructiveButtonClass}
              primaryButtonClass={primaryButtonClass}
              continueDisabled={continueDisabled}
              continueBlockMessage={continueBlockMessage}
              onClearAll={onClearAll}
              onContinue={onContinueToQuote}
            />
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}


