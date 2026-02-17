// components/P02c_QuotePreview.tsx
"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFn, NavSource, PageId } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { LiveGuidance } from "@/components/LiveGuidance";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { calculateCompanywideAllowance, includeEuAddOnsInAllowance } from "@/lib/allowanceMath";
import { validateContact } from "@/lib/contactValidation";
import { maxCompatibleCoveredEuAddOnsAmount } from "@/lib/coveredEuAddOnMaximum";
import { PRICING } from "@/lib/pricing";
import { buildQuotePdfBase64 } from "@/lib/quotePdf";
import { defaultDraft } from "@/lib/programDraft";
import {
  departmentAllowanceSummaryValues,
  departmentInvoicePerEmployeeValues,
  hasDepartmentAddOnsBreakdown,
  PRINT_KEEP_TOGETHER_CLASSES,
  resolveDepartmentBreakdownPrintState,
} from "@/lib/quotePreviewRules";
import type {  EUPackage,
  EUPackageAddOnKey,  DepartmentConfigRow,
  PaymentDiscount,
  ServiceTier,
} from "@/lib/programDraft";

const SHOWROOM_ADDRESS = import.meta.env.VITE_SHOWROOM_ADDRESS ?? "6780 Miramar Rd, San Diego, CA 92121";
const ONSIGHT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? "team@onsightoptics.com";
const ONSIGHT_PHONE = import.meta.env.VITE_SUPPORT_PHONE ?? "619-402-1033";

const BRAND_LOGO_URL = (import.meta.env.VITE_BRAND_LOGO_URL ?? "").trim();
const DEFAULT_LOGO_URL = "/brand/osso/osso-logo-horizontal.png";
const REMOTE_LOGO_FALLBACK =
  "https://raw.githubusercontent.com/framescalemarketing-code/osso-brand-assets/main/osso-logo-horizontal.png";

const SUBMIT_KEY = "osso_quote_preview_submission_v6";
const QUOTE_ID_PREFIX = "Q";
const ENABLE_QUOTE_SUBMIT = (import.meta.env.VITE_ENABLE_QUOTE_SUBMIT ?? "false").toLowerCase() === "true";

const EU_PACKAGE_ADD_ON_ITEMS: Array<{ key: EUPackageAddOnKey; label: string; amount: number }> = [
  { key: "antiFog" as EUPackageAddOnKey, label: "Anti-Fog", amount: PRICING.euPackageAddOnsPerEmployee.antiFog },
  { key: "antiReflectiveStd" as EUPackageAddOnKey, label: "Anti-Reflective", amount: PRICING.euPackageAddOnsPerEmployee.antiReflectiveStd },
  {
    key: "blueLightAntiReflective" as EUPackageAddOnKey,
    label: "Blue Light + Anti-Reflective Coating",
    amount: PRICING.euPackageAddOnsPerEmployee.blueLightAntiReflective,
  },
  { key: "extraScratchCoating" as EUPackageAddOnKey, label: "Extra Scratch Coating", amount: PRICING.euPackageAddOnsPerEmployee.extraScratchCoating },
  { key: "polarized" as EUPackageAddOnKey, label: "Polarized", amount: PRICING.euPackageAddOnsPerEmployee.polarized },
  { key: "tint" as EUPackageAddOnKey, label: "Tint", amount: PRICING.euPackageAddOnsPerEmployee.tint },
  { key: "transitions" as EUPackageAddOnKey, label: "Transitions", amount: PRICING.euPackageAddOnsPerEmployee.transitions },
  { key: "transitionsPolarized" as EUPackageAddOnKey, label: "Transitions Polarized", amount: PRICING.euPackageAddOnsPerEmployee.transitionsPolarized },
].sort((a, b) => a.label.localeCompare(b.label));



function clampInt(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

type SelectedOptionItem = { label: string; amount: number };

type CalculatorSelections = {
  addOns?: {
    euPackageAddOns?: Partial<Record<EUPackageAddOnKey, boolean>>;
  };
};

function selectedOptionsFromCalculator(calculator: CalculatorSelections) {
  const addOns: SelectedOptionItem[] = EU_PACKAGE_ADD_ON_ITEMS.filter(
    (i) => calculator.addOns?.euPackageAddOns?.[i.key]
  ).map((i) => ({ label: i.label, amount: i.amount }));

  return { addOns };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMoneyCents(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function safeText(v: string) {
  const t = (v ?? "").trim();
  return t ? t : "Not Provided";
}

function capitalizeFirst(s: string) {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.slice(0, 1).toUpperCase() + t.slice(1);
}



function eligibilityFrequencyLabel(freq?: string) {
  if (!freq) return "";
  if (freq === "biennial") return "Every 2 Years";
  if (freq === "annual") return "Annual";
  return capitalizeFirst(freq);
}
function quoteOptionsLabel(sideShieldType?: string) {
  if (sideShieldType === "removable") return "Removable";
  return "Permanent/Integrated";
}

function coverageTypeLabel(v: string) {
  if (v === "prescription_only") return "Prescription Only";
  if (v === "prescription_and_plano") return "Prescription + Plano";
  if (v === "plano_only") return "Plano Only";
  return "Prescription Only";
}

function allowanceScopeLabel(v: string) {
  if (v === "department_based") return "Department Based Allowances";
  return "Single Allowance For All Employees";
}

function discountLabel(discount: PaymentDiscount) {
  if (discount === "none") return "None";
  if (discount === "2_15_NET30") return "2% If Paid Within 15 Days";
  return "3% If Paid Within 10 Days";
}

function formatLocationAddress(loc: { streetAddress: string; city: string; state: string; zipCode: string }) {
  const parts = [loc.streetAddress, loc.city, loc.state, loc.zipCode].map((s) => s?.trim()).filter(Boolean);
  return parts.join(", ");
}

function isNonEmpty(value: string | undefined) {
  return Boolean(value?.trim());
}

function isLocationComplete(loc: { streetAddress: string; city: string; state: string }) {
  return isNonEmpty(loc.streetAddress) && isNonEmpty(loc.city) && isNonEmpty(loc.state);
}

function travelTotalForLocation(oneWayMiles: number, totalVisits: number) {
  const oneWay = Math.max(0, Number.isFinite(oneWayMiles) ? oneWayMiles : 0);
  const over = Math.max(0, oneWay - PRICING.travel.includedOneWayMiles);
  const billableRoundTripMiles = over * PRICING.travel.roundTripMultiplier;
  const feePerVisit = billableRoundTripMiles * PRICING.travel.dollarsPerMileOver;
  const total = feePerVisit * Math.max(0, totalVisits);
  return { oneWay, billableRoundTripMiles, feePerVisit, total };
}

function departmentAllowanceDetails(
  row: DepartmentConfigRow,
  baseAllowance: number,
  includeAddOnsInAllowance: boolean
) {
  const employees = clampInt(row.employeeCount);
  const selectedAddOns = EU_PACKAGE_ADD_ON_ITEMS.filter((i) => row.selections?.euPackageAddOns?.[i.key]);

  const addOnsPerEmployee = includeAddOnsInAllowance ? selectedAddOns.reduce((sum, i) => sum + i.amount, 0) : 0;

  const allowancePerEmployee = baseAllowance + addOnsPerEmployee;
  const allowanceSubtotal = allowancePerEmployee * employees;

  return {
    employees,
    allowancePerEmployee,
    allowanceSubtotal,
    selectedAddOnsLabels: selectedAddOns.map((i) => i.label),
  };
}

type DepartmentAllowanceBreakdownLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  allowancePerEmployee: number;
  allowanceSubtotal: number;
  selectedAddOnsLabels: string[];
};

type DepartmentServiceBreakdownLine = {
  id: string;
  departmentName: string;
  employeeCount: number;
  servicePerEmployee: number;
  serviceSubtotal: number;
};

type DepartmentAllowanceBreakdownTableProps = {
  rows: DepartmentAllowanceBreakdownLine[];
  employeesTotal: number;
  allowanceTotal: number;
};

const DepartmentAllowanceBreakdownTable = memo(function DepartmentAllowanceBreakdownTable({
  rows,
  employeesTotal,
  allowanceTotal,
}: DepartmentAllowanceBreakdownTableProps) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm font-semibold text-foreground">Department Allowance Breakdown</div>
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Allowance per Employee: <span className="font-medium text-foreground">{formatMoney(row.allowancePerEmployee)}</span></div>
            <div>Subtotal: <span className="font-medium text-foreground">{formatMoney(row.allowanceSubtotal)}</span></div>
          </div>
        ))}
        <div className="rounded-md border border-border bg-background p-3 text-xs font-semibold text-foreground">
          Totals: {employeesTotal} Employees (Total), {formatMoney(allowanceTotal)}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="breakdown-table w-full text-xs text-muted-foreground">
          <colgroup>
            <col className="breakdown-col-dept" />
            <col className="breakdown-col-employees" />
            <col className="breakdown-col-value" />
            <col className="breakdown-col-total" />
          </colgroup>
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-1 pr-2 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right font-semibold text-foreground">Employees (Total)</th>
              <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Allowance per Employee</th>
              <th className="breakdown-col-total py-1 pl-2 text-right font-semibold text-foreground">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-1 pr-2 text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{row.employeeCount}</td>
                <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.allowancePerEmployee)}</td>
                <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(row.allowanceSubtotal)}</td>
              </tr>
            ))}
            <tr className="font-semibold text-foreground">
              <td className="breakdown-col-dept py-1 pr-2">Totals</td>
              <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{employeesTotal}</td>
              <td className="breakdown-col-value py-1 px-2 text-right"></td>
              <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(allowanceTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

const DepartmentAddOnsBreakdownTable = memo(function DepartmentAddOnsBreakdownTable({
  rows,
  alignWithService = false,
}: {
  rows: DepartmentAllowanceBreakdownLine[];
  alignWithService?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm font-semibold text-foreground">Department Add-Ons Breakdown</div>
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Selected Add-Ons: <span className="font-medium text-foreground">{row.selectedAddOnsLabels.length ? row.selectedAddOnsLabels.join(", ") : "None"}</span></div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table
          className={`breakdown-table w-full text-sm text-muted-foreground ${alignWithService ? "table-fixed" : ""}`}
          style={alignWithService ? { tableLayout: "fixed" } : undefined}
        >
          <colgroup>
            <col className="breakdown-col-dept" />
            <col className="breakdown-col-employees" />
            <col className="breakdown-col-addons" />
          </colgroup>
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-1.5 pr-3 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num py-1.5 px-4 text-right font-semibold text-foreground">Employees (Total)</th>
              <th className="breakdown-col-addons py-1.5 pl-4 font-semibold text-foreground">Selected Add-Ons</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-1.5 pr-3 align-top text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num py-1.5 px-4 text-right align-top">{row.employeeCount}</td>
                <td className="breakdown-col-addons py-1.5 pl-4 align-top">{row.selectedAddOnsLabels.length ? row.selectedAddOnsLabels.join(", ") : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const DepartmentEuBreakdownTable = memo(function DepartmentEuBreakdownTable({
  rows,
  employeesTotal,
  allowanceTotal,
}: DepartmentAllowanceBreakdownTableProps) {
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm font-semibold text-foreground">Department EU Breakdown</div>
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Selected Add-Ons: <span className="font-medium text-foreground">{row.selectedAddOnsLabels.length ? row.selectedAddOnsLabels.join(", ") : "None"}</span></div>
            <div>Allowance per Employee: <span className="font-medium text-foreground">{formatMoney(row.allowancePerEmployee)}</span></div>
            <div>Subtotal: <span className="font-medium text-foreground">{formatMoney(row.allowanceSubtotal)}</span></div>
          </div>
        ))}
        <div className="rounded-md border border-border bg-background p-3 text-xs font-semibold text-foreground">
          Totals: {employeesTotal} Employees (Total), {formatMoney(allowanceTotal)}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="breakdown-table department-eu-breakdown-table w-full table-fixed text-sm text-muted-foreground">
          <colgroup>
            <col className="breakdown-col-dept" />
            <col className="breakdown-col-employees" />
            <col className="breakdown-col-addons" />
            <col className="breakdown-col-value" />
            <col className="breakdown-col-total" />
          </colgroup>
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-2 pr-4 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num department-eu-employees py-2 px-4 text-right font-semibold text-foreground">Employees (Total)</th>
              <th className="breakdown-col-addons department-eu-addons py-2 pl-6 font-semibold text-foreground">Selected Add-Ons</th>
              <th className="breakdown-col-value py-2 px-5 text-right font-semibold text-foreground">Allowance per Employee</th>
              <th className="breakdown-col-total py-2 pl-5 text-right font-semibold text-foreground">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-2 pr-4 align-top text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num department-eu-employees py-2 px-4 text-right align-top">{row.employeeCount}</td>
                <td className="breakdown-col-addons department-eu-addons py-2 pl-6 align-top leading-relaxed break-words">
                  {row.selectedAddOnsLabels.length ? row.selectedAddOnsLabels.join(", ") : "None"}
                </td>
                <td className="breakdown-col-value py-2 px-5 text-right align-top">{formatMoney(row.allowancePerEmployee)}</td>
                <td className="breakdown-col-total py-2 pl-5 text-right align-top">{formatMoney(row.allowanceSubtotal)}</td>
              </tr>
            ))}
            <tr className="font-semibold text-foreground">
              <td className="breakdown-col-dept py-2 pr-4">Totals</td>
              <td className="breakdown-col-employees breakdown-col-num department-eu-employees py-2 px-4 text-right">{employeesTotal}</td>
              <td className="breakdown-col-addons department-eu-addons py-2 pl-6"></td>
              <td className="breakdown-col-value py-2 px-5 text-right"></td>
              <td className="breakdown-col-total py-2 pl-5 text-right">{formatMoney(allowanceTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

const DepartmentServiceBreakdownTable = memo(function DepartmentServiceBreakdownTable({
  rows,
  employeesTotal,
  serviceTotal,
  alignWithEuCombined = false,
  alignWithAddOnsOnly = false,
}: {
  rows: DepartmentServiceBreakdownLine[];
  employeesTotal: number;
  serviceTotal: number;
  alignWithEuCombined?: boolean;
  alignWithAddOnsOnly?: boolean;
}) {
  const useFixedAlignment = alignWithEuCombined || alignWithAddOnsOnly;
  const includeAddOnsSpacerColumn = alignWithEuCombined || alignWithAddOnsOnly;
  return (
    <div className="mt-3">
      <div className="mb-2 text-sm font-semibold text-foreground">Service Tier Breakdown by Department</div>
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Service per Employee: <span className="font-medium text-foreground">{formatMoney(row.servicePerEmployee)}</span></div>
            <div>Subtotal: <span className="font-medium text-foreground">{formatMoney(row.serviceSubtotal)}</span></div>
          </div>
        ))}
        <div className="rounded-md border border-border bg-background p-3 text-xs font-semibold text-foreground">
          Totals: {employeesTotal} Employees (Total), {formatMoney(serviceTotal)}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table
          className={`breakdown-table w-full text-xs text-muted-foreground ${useFixedAlignment ? "table-fixed" : ""}`}
          style={useFixedAlignment ? { tableLayout: "fixed" } : undefined}
        >
          <colgroup>
            <col className="breakdown-col-dept" />
            <col className="breakdown-col-employees" />
            {includeAddOnsSpacerColumn ? <col className="breakdown-col-addons" /> : null}
            <col className="breakdown-col-value" />
            <col className="breakdown-col-total" />
          </colgroup>
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-1 pr-2 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right font-semibold text-foreground">Employees (Total)</th>
              {includeAddOnsSpacerColumn ? <th className="breakdown-col-addons py-1 pl-2 font-semibold text-foreground"></th> : null}
              <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Service per Employee</th>
              <th className="breakdown-col-total py-1 pl-2 text-right font-semibold text-foreground">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-1 pr-2 text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{row.employeeCount}</td>
                {includeAddOnsSpacerColumn ? <td className="breakdown-col-addons py-1 pl-2"></td> : null}
                <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.servicePerEmployee)}</td>
                <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(row.serviceSubtotal)}</td>
              </tr>
            ))}
            <tr className="font-semibold text-foreground">
              <td className="breakdown-col-dept py-1 pr-2">Totals</td>
              <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{employeesTotal}</td>
              {includeAddOnsSpacerColumn ? <td className="breakdown-col-addons py-1 pl-2"></td> : null}
              <td className="breakdown-col-value py-1 px-2 text-right"></td>
              <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(serviceTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
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

const DepartmentDiscountBreakdownTable = memo(function DepartmentDiscountBreakdownTable({
  rows,
}: {
  rows: DepartmentDiscountBreakdownLine[];
}) {
  const employeesTotal = rows.reduce((sum, row) => sum + row.employeeCount, 0);
  const discountTotalMax = rows.reduce((sum, row) => sum + row.discountTotalMax, 0);

  return (
    <div className="mt-3">
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Invoice per Employee: <span className="font-medium text-foreground">{formatMoney(row.invoicePerEmployee)}</span></div>
            <div>Discount Percent: <span className="font-medium text-foreground">{`${(row.discountPct * 100).toFixed(0)}%`}</span></div>
            <div>Max Discount per Invoice: <span className="font-medium text-foreground">{formatMoney(row.discountPerEmployeeMax)}</span></div>
            <div>Max Discount Total: <span className="font-medium text-foreground">{formatMoney(row.discountTotalMax)}</span></div>
          </div>
        ))}
        <div className="rounded-md border border-border bg-background p-3 text-xs font-semibold text-foreground">
          Totals: {employeesTotal} Employees (Total), {formatMoney(discountTotalMax)}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="breakdown-table w-full text-xs text-muted-foreground">
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-1 pr-2 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right font-semibold text-foreground">Employees (Total)</th>
              <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Invoice per Employee</th>
              <th className="breakdown-col-percent py-1 px-2 text-right font-semibold text-foreground">Discount Percent</th>
              <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Max Discount per Invoice</th>
              <th className="breakdown-col-total py-1 pl-2 text-right font-semibold text-foreground">Max Discount Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-1 pr-2 text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{row.employeeCount}</td>
                <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.invoicePerEmployee)}</td>
                <td className="breakdown-col-percent py-1 px-2 text-right">{`${(row.discountPct * 100).toFixed(0)}%`}</td>
                <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.discountPerEmployeeMax)}</td>
                <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(row.discountTotalMax)}</td>
              </tr>
            ))}
            <tr className="font-semibold text-foreground">
              <td className="breakdown-col-dept py-1 pr-2">Totals</td>
              <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{employeesTotal}</td>
              <td className="breakdown-col-value py-1 px-2 text-right"></td>
              <td className="breakdown-col-percent py-1 px-2 text-right"></td>
              <td className="breakdown-col-value py-1 px-2 text-right"></td>
              <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(discountTotalMax)}</td>
            </tr>
          </tbody>
        </table>
      </div>
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


const DepartmentInvoiceBreakdownTable = memo(function DepartmentInvoiceBreakdownTable({
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
    <div className="mt-3">
      <div className="space-y-2 md:hidden print:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
            <div className="text-sm font-semibold text-foreground">{row.departmentName}</div>
            <div className="mt-1">Employees (Total): <span className="font-medium text-foreground">{row.employeeCount}</span></div>
            <div>Invoice per Employee: <span className="font-medium text-foreground">{formatMoney(row.invoicePerEmployee)}</span></div>
            {showFees ? <div>Finance Fee per Invoice: <span className="font-medium text-foreground">{formatMoney(row.financeFeePerInvoice)}</span></div> : null}
            <div>Invoice Total: <span className="font-medium text-foreground">{formatMoney(row.invoiceTotal)}</span></div>
            {showFees ? <div>Finance Fee Total: <span className="font-medium text-foreground">{formatMoney(row.financeFeeTotal)}</span></div> : null}
          </div>
        ))}
        <div className="rounded-md border border-border bg-background p-3 text-xs font-semibold text-foreground">
          Totals: {employeesTotal} Employees (Total), {formatMoney(invoiceTotal)}
          {showFees ? `, ${formatMoney(financeFeeTotal)} Finance Fee Total` : ""}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="breakdown-table w-full text-xs text-muted-foreground">
          <thead>
            <tr className="text-left">
              <th className="breakdown-col-dept py-1 pr-2 font-semibold text-foreground">Department</th>
              <th className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right font-semibold text-foreground">Employees (Total)</th>
              <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Invoice per Employee</th>
              {showFees ? (
                <th className="breakdown-col-value py-1 px-2 text-right font-semibold text-foreground">Finance Fee per Invoice</th>
              ) : null}
              <th className="breakdown-col-total py-1 pl-2 text-right font-semibold text-foreground">Invoice Total</th>
              {showFees ? (
                <th className="breakdown-col-total py-1 pl-2 text-right font-semibold text-foreground">Finance Fee Total</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="breakdown-col-dept py-1 pr-2 text-foreground">{row.departmentName}</td>
                <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{row.employeeCount}</td>
                <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.invoicePerEmployee)}</td>
                {showFees ? (
                  <td className="breakdown-col-value py-1 px-2 text-right">{formatMoney(row.financeFeePerInvoice)}</td>
                ) : null}
                <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(row.invoiceTotal)}</td>
                {showFees ? (
                  <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(row.financeFeeTotal)}</td>
                ) : null}
              </tr>
            ))}
            <tr className="font-semibold text-foreground">
              <td className="breakdown-col-dept py-1 pr-2">Totals</td>
              <td className="breakdown-col-employees breakdown-col-num py-1 px-2 text-right">{employeesTotal}</td>
              <td className="breakdown-col-value py-1 px-2 text-right"></td>
              {showFees ? <td className="breakdown-col-value py-1 px-2 text-right"></td> : null}
              <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(invoiceTotal)}</td>
              {showFees ? <td className="breakdown-col-total py-1 pl-2 text-right">{formatMoney(financeFeeTotal)}</td> : null}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

export function QuotePreviewPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft } = useProgramDraft();
  const [actionMessage, setActionMessage] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftDiagnostics, setShowDraftDiagnostics] = useState(false);
  const [finalQuoteMeta, setFinalQuoteMeta] = useState<{ id: string; createdAtIso: string } | null>(null);
  const draftQuoteMetaRef = useState(() => {
    const createdAtIso = new Date().toISOString();
    const id = `D${createdAtIso.replaceAll("-", "").slice(0, 8)}${createdAtIso.replaceAll(":", "").slice(11, 15)}`;
    return { id, createdAtIso };
  })[0];
  const brandLogoUrl = useMemo(() => BRAND_LOGO_URL || DEFAULT_LOGO_URL || REMOTE_LOGO_FALLBACK, []);

  const effectiveQuoteMeta = finalQuoteMeta ?? draftQuoteMetaRef;

  function generateQuoteId() {
    const createdAtIso = new Date().toISOString();
    const id = `${QUOTE_ID_PREFIX}${createdAtIso.replaceAll("-", "").slice(0, 8)}${createdAtIso.replaceAll(":", "").slice(11, 15)}`;
    return { id, createdAtIso };
  }

  useEffect(() => {
    const onAfterPrint = () => {
      setIsPrinting(false);

      // Only lock a quote id after a print flow completes; reuse once set
      setFinalQuoteMeta((prev) => {
        if (prev) return prev;
        return generateQuoteId();
      });
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  useEffect(() => {
    if (!isPrinting) return;

    const t = window.setTimeout(() => {
      window.print();
    }, 50);

    return () => window.clearTimeout(t);
  }, [isPrinting]);

  function nav(page: PageId, via: NavSource) {
    onNavigate(page, via);
  }

  const calculator = draft?.calculator ?? defaultDraft.calculator;
  const guidelines = {
    ...defaultDraft.builder.guidelines,
    ...(draft?.builder?.guidelines ?? {}),
    restrictions: {
      ...defaultDraft.builder.guidelines.restrictions,
      ...(draft?.builder?.guidelines?.restrictions ?? {}),
    },
  };
  const calculatorAddOns = calculator.addOns ?? defaultDraft.calculator.addOns;
  const coverageType = guidelines.coverageType ?? "prescription_only";
  const allowanceScope = guidelines.allowanceScope ?? "companywide";
  const isDepartmentBased = allowanceScope === "department_based";
  const departmentConfigs: DepartmentConfigRow[] = useMemo(
    () => calculator.departmentConfigs ?? [],
    [calculator.departmentConfigs]
  );

  const selectedAddOns = useMemo(() => {
    if (isDepartmentBased) {
      const keys = new Set<EUPackageAddOnKey>();
      departmentConfigs.forEach((row) => {
        EU_PACKAGE_ADD_ON_ITEMS.forEach((item) => {
          if (row.selections?.euPackageAddOns?.[item.key]) keys.add(item.key);
        });
      });

      return EU_PACKAGE_ADD_ON_ITEMS.filter((i) => keys.has(i.key)).map((i) => ({
        label: i.label,
        amount: i.amount,
      }));
    }

    return EU_PACKAGE_ADD_ON_ITEMS.filter((i) => calculatorAddOns.euPackageAddOns[i.key]).map((i) => ({
      label: i.label,
      amount: i.amount,
    }));
  }, [calculatorAddOns.euPackageAddOns, departmentConfigs, isDepartmentBased]);

  const submitValidationMessage = useMemo(() => {
    const contact = calculator.contact;
    const contactValidation = validateContact(contact);

    if (contactValidation.missing.length > 0) {
      return `Complete all contact fields before submitting: ${contactValidation.missing.join(", ")}.`;
    }

    if (contactValidation.invalid.length > 0) {
      return `Fix invalid contact fields before submitting: ${contactValidation.invalid.join(", ")}.`;
    }

    const hasAtLeastOneLocation = calculator.locations.some((loc) => isLocationComplete(loc));
    if (!hasAtLeastOneLocation) {
      return "Add at least one location with street, city, and state before submitting.";
    }

    return "";
  }, [calculator.contact, calculator.locations]);

  const estimate = useMemo(() => {
    const employeesRaw = calculator.eligibleEmployees === "" ? 0 : calculator.eligibleEmployees;
    const employeesDefault = clampInt(employeesRaw);

    const selectedEU = calculator.selectedEU;
    const selectedTier = calculator.selectedTier;

    const hasProgramSelections = Boolean(selectedEU) && Boolean(selectedTier);
    const safeSelectedEU: EUPackage | "" = selectedEU ? (selectedEU as EUPackage) : "";
    const safeSelectedTier: ServiceTier | "" = selectedTier ? (selectedTier as ServiceTier) : "";
    const baseEUAllowance = safeSelectedEU ? PRICING.euAllowancePerEmployee[safeSelectedEU] : 0;

    const includeAddOnsInAllowance = hasProgramSelections && includeEuAddOnsInAllowance();

    const departmentRows = departmentConfigs;

    const departmentAllowanceBreakdown = isDepartmentBased
      ? departmentRows.map((row, index) => {
          const details = departmentAllowanceDetails(row, baseEUAllowance, includeAddOnsInAllowance);
          return {
            id: row.id,
            departmentName: row.name.trim() || `D${index + 1}`,
            employeeCount: details.employees,
            allowancePerEmployee: details.allowancePerEmployee,
            allowanceSubtotal: details.allowanceSubtotal,
            selectedAddOnsLabels: details.selectedAddOnsLabels,
          };
        })
      : [];

    const departmentEmployees = isDepartmentBased
      ? departmentAllowanceBreakdown.reduce((sum, row) => sum + row.employeeCount, 0)
      : 0;

    const employees = isDepartmentBased ? departmentEmployees : employeesDefault;

    const locations = calculator.locations ?? [];
    const locationCount = Math.max(1, locations.length);

    const onboardingBase = hasProgramSelections ? PRICING.onboardingFeeSingleSiteStandard : 0;
    const additionalSitesCount = Math.max(0, locationCount - 1);
    const onboardingAdditionalSitesFeePerSite = hasProgramSelections ? PRICING.onboardingFeeAdditionalSite : 0;
    const onboardingFee = onboardingBase + additionalSitesCount * onboardingAdditionalSitesFeePerSite;

    const includedVisits = safeSelectedTier ? PRICING.standardVisitsByTier[safeSelectedTier] : 0;

    const includedVisitsAcrossLocations = includedVisits * locationCount;
    const legacyExtraVisits = calculatorAddOns.extraSiteVisits === "" ? 0 : clampInt(calculatorAddOns.extraSiteVisits);
    const locationExtraVisits = locations.map((loc) => clampInt(loc.additionalOnsiteVisits));
    const hasLocationVisitOverrides = locationExtraVisits.some((v) => v > 0);
    const normalizedLocationExtraVisits =
      hasLocationVisitOverrides || legacyExtraVisits === 0
        ? locationExtraVisits
        : locationExtraVisits.map((v, idx) => (idx === 0 ? v + legacyExtraVisits : v));
    const extraVisits = hasProgramSelections
      ? normalizedLocationExtraVisits.reduce((sum, visits) => sum + visits, 0)
      : 0;
    const totalVisits = includedVisitsAcrossLocations + extraVisits;

    const extraVisitsFee = hasProgramSelections ? extraVisits * PRICING.extraSiteVisitFee : 0;

    const euPackageAddOnsPerEmployeeGlobal = hasProgramSelections
      ? EU_PACKAGE_ADD_ON_ITEMS.reduce((sum, item) => {
          return sum + (calculatorAddOns.euPackageAddOns[item.key] ? item.amount : 0);
        }, 0)
      : 0;

    let allowancePerEmployee: number;
    let allowanceTotal: number;
    const euBaseAllowance = baseEUAllowance;
    let euPackageAddOnsPerEmployee = euPackageAddOnsPerEmployeeGlobal;
    const coveredExampleAntiFogPerEmployee = PRICING.euPackageAddOnsPerEmployee.antiFog;
    const coveredExampleAntiReflectivePerEmployee = PRICING.euPackageAddOnsPerEmployee.antiReflectiveStd;
    const coveredExampleTintPerEmployee = PRICING.euPackageAddOnsPerEmployee.tint;
    const coveredSelectedAddOns = EU_PACKAGE_ADD_ON_ITEMS.filter((item) => calculatorAddOns.euPackageAddOns[item.key]);
    const coveredSelectedAddOnsLabels = coveredSelectedAddOns.map(
      (item) => `${item.label} ${formatMoney(item.amount)}`
    );
    const coveredAllAddOnsPerEmployee = maxCompatibleCoveredEuAddOnsAmount(EU_PACKAGE_ADD_ON_ITEMS);
    const coveredExampleFloorPerEmployee = safeSelectedEU === "Covered" ? euBaseAllowance : 0;
    const coveredExampleFloorTotal = coveredExampleFloorPerEmployee * employees;
    const coveredExampleCeilingPerEmployee =
      safeSelectedEU === "Covered" ? coveredExampleFloorPerEmployee + coveredAllAddOnsPerEmployee : 0;
    const coveredExampleCeilingTotal = coveredExampleCeilingPerEmployee * employees;
    const coveredExampleCombinationPerEmployee =
      safeSelectedEU === "Covered" ? coveredExampleFloorPerEmployee + euPackageAddOnsPerEmployeeGlobal : 0;
    const coveredExampleCombinationTotal = coveredExampleCombinationPerEmployee * employees;

    if (isDepartmentBased) {
      allowanceTotal = departmentAllowanceBreakdown.reduce((sum, row) => sum + row.allowanceSubtotal, 0);
      allowancePerEmployee = employees > 0 ? allowanceTotal / employees : 0;
      euPackageAddOnsPerEmployee = 0;
    } else {
      const allowance = calculateCompanywideAllowance({
        baseEUAllowance: euBaseAllowance,
        euPackageAddOnsPerEmployee: euPackageAddOnsPerEmployeeGlobal,
        employees,
      });
      allowancePerEmployee = allowance.allowancePerEmployee;
      allowanceTotal = allowance.allowanceTotal;
    }

    const tierBaseServicePerEmployee = safeSelectedTier ? PRICING.serviceFeePerEmployee[safeSelectedTier] : 0;

    const servicePerEmployee = tierBaseServicePerEmployee;
    const serviceTotal = tierBaseServicePerEmployee * employees;

    const travelByLocation = locations.map((loc, idx) => {
      const locationExtraVisits = hasProgramSelections ? (normalizedLocationExtraVisits[idx] ?? 0) : 0;
      const locationTotalVisits = hasProgramSelections ? includedVisits + locationExtraVisits : 0;
      const additionalVisitFees = locationExtraVisits * PRICING.extraSiteVisitFee;
      const tm = hasProgramSelections
        ? travelTotalForLocation(loc.oneWayMiles, locationTotalVisits)
        : {
            oneWay: 0,
            billableRoundTripMiles: 0,
            feePerVisit: 0,
            total: 0,
          };
      return {
        label: loc.label,
        address: formatLocationAddress(loc),
        autoDistance: Boolean(loc.autoDistance),
        oneWayMiles: tm.oneWay,
        oneWayMinutes: clampInt(loc.oneWayMinutes),
        includedVisits,
        extraVisits: locationExtraVisits,
        totalVisits: locationTotalVisits,
        billableRoundTripMiles: tm.billableRoundTripMiles,
        feePerVisit: tm.feePerVisit,
        total: tm.total,
        additionalVisitFees,
        locationSubtotal: tm.total + additionalVisitFees,
      };
    });
    const travelTotal = travelByLocation.reduce((sum, row) => sum + row.total, 0);

    const subtotal = onboardingFee + allowanceTotal + serviceTotal + extraVisitsFee + travelTotal;

    const paymentTerms = calculator.paymentTerms;
    const paymentDiscount = calculator.paymentDiscount;

    const financeFeePerInvoice = hasProgramSelections ? PRICING.financeFeesPerInvoice[paymentTerms] : 0;
    const financeFeeTotal = financeFeePerInvoice * employees;

    const discountAllowed = hasProgramSelections && paymentTerms === "NET30";
    const discountPct = discountAllowed ? PRICING.paymentDiscounts[paymentDiscount] : 0;

    const invoicePerEmployee = allowancePerEmployee + servicePerEmployee;
    const invoiceTotal = invoicePerEmployee * employees;

    const discountPerEmployeeMax = invoicePerEmployee * discountPct;
    const discountTotalMax = invoiceTotal * discountPct;

    const grandTotal = subtotal - discountTotalMax + financeFeeTotal;

    return {
      employees,
      selectedEU,
      selectedTier,

      locationCount,

      onboardingBase,
      additionalSitesCount,
      onboardingAdditionalSitesFeePerSite,
      onboardingFee,

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
      allowanceTotal,

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

      paymentTerms,
      financeFeePerInvoice,
      financeFeeTotal,

      paymentDiscount,
      discountAllowed,
      discountPct,
      invoicePerEmployee,
      invoiceTotal,
      discountPerEmployeeMax,
      discountTotalMax,

      grandTotal,

      isDepartmentBased,
      departmentAllowanceBreakdown,
    };
  }, [calculator, calculatorAddOns, isDepartmentBased, departmentConfigs]);

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  const envValidationMessage = ENABLE_QUOTE_SUBMIT && !apiBaseUrl
    ? "Configuration error: VITE_API_BASE_URL is missing. Set it in your environment before submitting quotes."
    : "";

  function finalizeQuoteMeta() {
    const meta = generateQuoteId();
    setFinalQuoteMeta(meta);
    return meta;
  }

  async function submitQuote() {
    if (!ENABLE_QUOTE_SUBMIT) return;
    setActionMessage("");

    if (envValidationMessage) {
      setActionMessage(envValidationMessage);
      return;
    }

    if (submitValidationMessage) {
      setActionMessage(submitValidationMessage);
      return;
    }

    setIsSubmitting(true);

    const meta = finalizeQuoteMeta();

    let pdfBase64: string | undefined;
    let pdfFilename: string | undefined;

    try {
      const pdf = await buildQuotePdfBase64({
        quoteId: meta.id,
        createdAtIso: meta.createdAtIso,
        showroomReference: SHOWROOM_ADDRESS,
        estimate,
        contact: draft?.calculator?.contact ?? {},
        program: {
          eligibleEmployees: draft?.calculator?.eligibleEmployees,
          selectedEU: draft?.calculator?.selectedEU,
          selectedTier: draft?.calculator?.selectedTier,
          includedVisits: estimate.includedVisits,
          extraVisits: estimate.extraVisits,
          totalVisits: estimate.totalVisits,
          locationCount: estimate.locationCount,
          paymentTerms: estimate.paymentTerms,
          paymentDiscount: estimate.paymentDiscount,
          financeFeePerInvoice: estimate.financeFeePerInvoice,
          discountPerEmployeeMax: estimate.discountPerEmployeeMax,
          discountTotalMax: estimate.discountTotalMax,
        },
        selectedOptions: selectedOptionsFromCalculator(draft?.calculator ?? {}),
        guidelines: draft?.builder?.guidelines ?? {},
      });
      pdfBase64 = pdf.pdfBase64;
      pdfFilename = pdf.pdfFilename;
    } catch (pdfError) {
      setIsSubmitting(false);
      const message = pdfError instanceof Error ? pdfError.message : "PDF generation failed.";
      setActionMessage(`Quote could not be submitted. ${message}`);
      return;
    }

    const payload = {
      quoteId: meta.id,
      createdAtIso: meta.createdAtIso,
      showroomReference: SHOWROOM_ADDRESS,
      draft,
      estimate,
      pdfBase64,
      pdfFilename,
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/send-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const rawDetail = await response.text();
        let detail = rawDetail;

        try {
          const parsed = JSON.parse(rawDetail);

          // Prefer structured details from the server
          if (parsed?.detail) {
            if (typeof parsed.detail === "string") {
              detail = `${parsed.error || "Error"}: ${parsed.detail}`;
            } else {
              detail = `${parsed.error || "Error"}: ${JSON.stringify(parsed.detail)}`;
            }
          } else {
            detail = parsed?.error || parsed?.message || rawDetail;
          }
        } catch (parseError) {
          console.debug("send-quote parse error", parseError);
          // keep rawDetail
        }

        throw new Error(detail || "Server returned an error while sending the quote.");
      }

      try {
        localStorage.setItem(SUBMIT_KEY, JSON.stringify(payload));
      } catch (storageError) {
        console.debug("send-quote localStorage error", storageError);
      }

      setActionMessage(`Quote ${meta.id} submitted! A confirmation will be sent shortly.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      setActionMessage(`Quote could not be submitted. ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function printQuoteTwoPages() {
    setActionMessage("");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setIsPrinting(true);
  }

  const subtleCardClass = "rounded-md bg-secondary/30 p-3 sm:p-4";
  const subtleCardPrintClass = "quote-print-card rounded-md bg-secondary/30";
  const cardTitleClass = `text-sm font-semibold text-foreground ${PRINT_KEEP_TOGETHER_CLASSES.sectionHeader}`;
  const rowTextClass = "mt-2 grid gap-1.5 text-sm leading-6 text-muted-foreground";

  const QuoteHeader = ({ tight }: { tight: boolean }) => (
    <div className={tight ? "quote-print-header" : "px-4 py-4 sm:px-6 sm:py-5"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          {brandLogoUrl ? (
            <img src={brandLogoUrl} alt="On-Sight Safety Optics" className="mt-0.5 h-9 w-auto" />
          ) : null}
          <div className="space-y-1">
            <div className="text-xl font-semibold text-[#244093]">On-Sight Safety Optics Quote</div>
            <div className="text-sm text-[#1e3a8a]">
              Quote ID: <span className="font-medium text-foreground">{effectiveQuoteMeta.id}</span>
            </div>
            <div className="text-sm text-[#1e3a8a]">
              Date: <span className="font-medium text-foreground">{formatDate(effectiveQuoteMeta.createdAtIso)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-left sm:text-right">
          <div className="text-sm font-semibold text-foreground">Showroom Reference</div>
          <div className="text-xs text-muted-foreground">{SHOWROOM_ADDRESS}</div>

          <div className="pt-2 text-sm font-semibold text-foreground">On-Sight Contact</div>
          <div className="text-xs text-muted-foreground">{ONSIGHT_EMAIL}</div>
          <div className="text-xs text-muted-foreground">{ONSIGHT_PHONE}</div>
        </div>
      </div>
    </div>
  );

  const ContactDetailsCard = ({ print }: { print: boolean }) => (
    <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Contact Details</div>
      <div className={rowTextClass}>
        <div>
          Company Name: <span className="font-medium text-foreground">{safeText(calculator.contact.companyName)}</span>
        </div>
        <div>
          Full Name: <span className="font-medium text-foreground">{safeText(calculator.contact.fullName)}</span>
        </div>
        <div>
          Email: <span className="font-medium text-foreground">{safeText(calculator.contact.email)}</span>
        </div>
        <div>
          Phone: <span className="font-medium text-foreground">{safeText(calculator.contact.phone)}</span>
        </div>
      </div>
    </div>
  );

  const ProgramGuidelinesCard = ({ print }: { print: boolean }) => (
    <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Program Guidelines</div>
      <div className={rowTextClass}>
        <div>
          Coverage Type: <span className="font-medium text-foreground">{coverageTypeLabel(coverageType)}</span>
        </div>
        <div>
          Allowance Scope: <span className="font-medium text-foreground">{allowanceScopeLabel(allowanceScope)}</span>
        </div>
        <div>
          Side Shield Type: <span className="font-medium text-foreground">{quoteOptionsLabel(guidelines.sideShieldType)}</span>
        </div>
        <div>
          Eligibility Frequency:{" "}
          <span className="font-medium text-foreground">{eligibilityFrequencyLabel(guidelines.eligibilityFrequency)}</span>
        </div>
        <div>
          Approvals:{" "}
          <span className="font-medium text-foreground">
            {guidelines.approvalWorkflowEnabled ? "Enabled" : "Not Enabled"}
          </span>
        </div>

        <div className="pt-2 font-medium text-foreground">Restrictions</div>
        <div>
          Restrict Sunglass Options:{" "}
          <span className="font-medium text-foreground">
            {guidelines.restrictions.restrictSunglassOptions ? "Yes" : "No"}
          </span>
        </div>
        <div>
          Restrict UV Reactive Photochromic Lenses:{" "}
          <span className="font-medium text-foreground">
            {guidelines.restrictions.restrictUvReactivePhotochromicLenses ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );

  const NotesCard = ({ print }: { print: boolean }) =>
    guidelines.notes?.trim() ? (
      <div className={print ? subtleCardPrintClass : subtleCardClass}>
        <div className={cardTitleClass}>Notes</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{guidelines.notes}</div>
      </div>
    ) : null;

  const CompactSelectedOptionsCard = ({ print }: { print: boolean }) => {
    const containerClass = print ? subtleCardPrintClass : subtleCardClass;

    return (
      <div className={containerClass}>
        <div className={cardTitleClass}>Selected Options</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-foreground">EU Package Add-Ons</div>
            {estimate.selectedEU === "Covered" ? (
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Covered includes all EU Package add-ons.
              </div>
            ) : null}
            {selectedAddOns.length === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">None selected.</div>
            ) : (
              <div className="mt-2 space-y-1">
                {selectedAddOns.map((i) => (
                  <div key={i.label} className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
                    <div className="leading-snug">{i.label}</div>
                    <div className="shrink-0 font-medium text-foreground">{formatMoney(i.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const LocationsCard = ({ print }: { print: boolean }) => (
    <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Locations and Additional Visits</div>

      {(calculator.locations ?? []).length === 0 ? (
        <div className={`${PRINT_KEEP_TOGETHER_CLASSES.sectionLead} mt-2 text-sm text-muted-foreground`}>No locations provided.</div>
      ) : (
        <>
          {(() => {
            const locationCountForVisits = Math.max(1, estimate.travelByLocation.length);
            const hasMultipleLocations = locationCountForVisits > 1;
            const totalLocationVisits = estimate.totalVisits;
            return (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.sectionLead} mt-2`}>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <div>
                {hasMultipleLocations
                  ? `Your selected service tier includes a standard number of visits per year. This includes ${estimate.includedVisits} visit${estimate.includedVisits === 1 ? "" : "s"} for each location.`
                  : "Your selected service tier includes a standard number of visits per year."}
              </div>
              <div>
                Visits Included In Service Tier: <span className="font-medium text-foreground">{estimate.includedVisits}</span>
              </div>
              <div>
                Additional Visits: <span className="font-medium text-foreground">{estimate.extraVisits}</span>
              </div>
              {hasMultipleLocations ? (
                <div>
                  Included Visits Across Locations: <span className="font-medium text-foreground">{estimate.includedVisits * locationCountForVisits}</span>
                </div>
              ) : null}
              <div>
                Total Visits:{" "}
                <span className="font-medium text-foreground">{hasMultipleLocations ? totalLocationVisits : estimate.totalVisits}</span>
              </div>
              <div>
                {estimate.extraVisits} Additional Visit(s) x{" "}
                <span className="font-medium text-foreground">{formatMoney(PRICING.extraSiteVisitFee)}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Additional Visit Fees: <span className="font-semibold text-foreground">{formatMoney(estimate.extraVisitsFee)}</span>
            </div>
          </div>
            );
          })()}

          <div className="mt-2 grid gap-2">
            {estimate.travelByLocation.map((loc) => (
              <div
                key={loc.label}
                className={`${PRINT_KEEP_TOGETHER_CLASSES.locationItem} rounded-md border border-border bg-background p-3`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">
                    {loc.label}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{`Additional Visits: ${loc.extraVisits}`}</div>
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {loc.address ? loc.address : "Address not provided"}
                </div>

                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <div>
                    Distance Mode:{" "}
                    <span className="font-medium text-foreground">{loc.autoDistance ? "Auto" : "Manual"}</span>
                  </div>
                  <div>
                    One Way Miles:{" "}
                    <span className="font-medium text-foreground">{loc.oneWayMiles}</span>
                  </div>
                  <div>
                    Miles Over 50 (One Way):{" "}
                    <span className="font-medium text-foreground">
                      {Math.max(0, Math.round((loc.oneWayMiles - PRICING.travel.includedOneWayMiles) * 10) / 10)}
                    </span>
                  </div>
                  <div>
                    One Way Drive Time:{" "}
                    <span className="font-medium text-foreground">
                      {loc.oneWayMinutes > 0 ? `${loc.oneWayMinutes} min` : "Not Available"}
                    </span>
                  </div>
                  <div>
                    Billable Round Trip Miles per Visit:{" "}
                    <span className="font-medium text-foreground">
                      {Math.round(loc.billableRoundTripMiles * 10) / 10}
                    </span>
                  </div>
                  <div>
                    Total Location Visits: <span className="font-medium text-foreground">{loc.totalVisits}</span>
                  </div>
                  <div>
                    Travel Surcharge per Visit:{" "}
                    <span className="font-medium text-foreground">
                      {formatMoneyCents(loc.feePerVisit)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-sm font-semibold text-foreground">{formatMoneyCents(loc.locationSubtotal)}</div>
              </div>
            ))}
          </div>

          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.locationSummary} mt-3 rounded-md border border-border bg-background p-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">
                Travel Surcharge & Additional Visit Total
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatMoneyCents(estimate.travelByLocation.reduce((sum, loc) => sum + loc.locationSubtotal, 0))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );


  const ProgramInputsCard = ({ print }: { print: boolean }) => {
    const canShowDepartmentAllowanceBreakdown = isDepartmentBased && estimate.departmentAllowanceBreakdown.length > 0;
    const canShowDepartmentAddOnsBreakdown =
      isDepartmentBased &&
      estimate.departmentAllowanceBreakdown.length > 0 &&
      hasDepartmentAddOnsBreakdown(estimate.departmentAllowanceBreakdown);
    const departmentServiceBreakdown: DepartmentServiceBreakdownLine[] = estimate.departmentAllowanceBreakdown.map((row) => ({
      id: row.id,
      departmentName: row.departmentName,
      employeeCount: row.employeeCount,
      servicePerEmployee: estimate.servicePerEmployee,
      serviceSubtotal: estimate.servicePerEmployee * row.employeeCount,
    }));
    const canShowDepartmentServiceBreakdown = isDepartmentBased && departmentServiceBreakdown.length > 0;
    const {
      showPrintDepartmentEuBreakdown,
      showPrintDepartmentAllowanceBreakdown,
      showPrintDepartmentAddOnsBreakdown,
      showPrintDepartmentServiceBreakdown,
      showPrintAddOnsServiceAlignmentMode,
    } = resolveDepartmentBreakdownPrintState({
      print,
      canShowDepartmentAllowanceBreakdown,
      canShowDepartmentAddOnsBreakdown,
      canShowDepartmentServiceBreakdown,
      showDepartmentAllowanceBreakdown,
      showDepartmentAddOnsBreakdown,
      showDepartmentServiceBreakdown,
    });

    return (
      <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Program Inputs</div>
      <div className={rowTextClass}>
        <div>
          {"Employees (Total)"}:{" "}
          <span className="font-medium text-foreground">{estimate.employees}</span>
        </div>
        {isDepartmentBased ? (
          <div>
            Departments: <span className="font-medium text-foreground">{departmentConfigs.length}</span>
          </div>
        ) : null}
        <div>
          EU Package: <span className="font-medium text-foreground">{estimate.selectedEU || "Not Selected"}</span>
        </div>
        <div>
          Service Tier: <span className="font-medium text-foreground">{estimate.selectedTier || "Not Selected"}</span>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-border bg-background p-3">
        <div className="text-sm font-semibold text-foreground">{`EU Package: ${estimate.selectedEU || "Not Selected"}`}</div>
        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
          <div>
            {"Employees (Total)"}:{" "}
            <span className="font-medium text-foreground">{estimate.employees}</span>
          </div>
          {!isDepartmentBased && estimate.selectedEU !== "Covered" ? (
            <div>
              Total Allowance per Employee:{" "}
              <span className="font-medium text-foreground">{formatMoney(estimate.allowancePerEmployee)}</span>
            </div>
          ) : null}
          {estimate.selectedEU === "Covered" ? (
            <>
              <div>
                {isDepartmentBased ? "Configured allowance per Employee:" : "Base allowance per Employee:"}{" "}
                {isDepartmentBased && estimate.departmentAllowanceBreakdown.length > 0 ? (
                  estimate.departmentAllowanceBreakdown.map((row, index) => (
                    <span key={row.id}>
                      <span>{`D${index + 1} `}</span>
                      <span className="font-medium text-foreground">{formatMoney(row.allowancePerEmployee)}</span>
                      {index < estimate.departmentAllowanceBreakdown.length - 1 ? ", " : ""}
                    </span>
                  ))
                ) : (
                  <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleFloorPerEmployee)}</span>
                )}
              </div>
              <div>
                Available allowance per Employee:{" "}
                <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleCeilingPerEmployee)}</span>
              </div>
            </>
          ) : null}
        </div>
        {estimate.selectedEU === "Covered" ? (
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div>
              Allowance Total:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(isDepartmentBased ? estimate.allowanceTotal : estimate.coveredExampleFloorTotal)}
              </span>
            </div>
            <div>
              Allowance Total (Available):{" "}
              <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleCeilingTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            Allowance Total: <span className="font-medium text-foreground">{formatMoney(estimate.allowanceTotal)}</span>
          </div>
        )}
        {estimate.selectedEU === "Covered" && !isDepartmentBased ? (
          <details
            className="mt-2 text-xs text-muted-foreground"
            open={showCoveredClarification}
            onToggle={(event) => setShowCoveredClarification(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-foreground/80">Need clarification? See how Covered allowance works.</summary>
            <div className="mt-2 space-y-2 leading-relaxed">
              <div>
                The Covered EU Package means employees have the base allowance of Complete and can choose{" "}
                <span className="italic">any</span> combination of any included add-ons.
              </div>
              <div className="text-[11px] leading-relaxed">
                *Disclaimer: Lens pairing and configuration logic still apply. Blue Light + Anti-Reflective cannot be combined
                with standard Anti-Reflective, and Polarized Sun Glasses + Transitions should be selected as Transitions
                Polarized.
              </div>
              <div>
                <span className="font-medium text-foreground">Allowance Total</span> is the configured base coverage.
              </div>
              <div>
                <span className="font-medium text-foreground">Allowance Total (Available)</span> reflects the full-coverage
                package value when included add-ons are maximized within lens compatibility rules.
              </div>
              {isDepartmentBased ? (
                <div>
                  Department-based mode uses each department&apos;s configured allowance as the base. Use the Department
                  Allowance Breakdown for each department&apos;s totals.
                </div>
              ) : (
                <>
                  <div className="font-semibold text-foreground">Example combination:</div>
                  {estimate.coveredSelectedAddOnsLabels.length > 0 ? (
                    <>
                      <div>
                        Base allowance of{" "}
                        <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleFloorPerEmployee)}</span>{" "}
                        +{" "}
                        <span className="font-medium text-foreground">{estimate.coveredSelectedAddOnsLabels.join(" + ")}</span>{" "}
                        ={" "}
                        <span className="font-medium text-foreground">
                          {formatMoney(estimate.coveredExampleCombinationPerEmployee)}
                        </span>
                      </div>
                      <div>
                        Multiplied by employees for a subtotal:{" "}
                        <span className="font-medium text-foreground">{formatMoney(estimate.coveredExampleCombinationTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div>Select at least one included EU add-on to see an example combination.</div>
                  )}
                </>
              )}
              <div>Contact an OSSO Program Specialist:</div>
            </div>
            <div className="mt-1">
              <a href={`mailto:${ONSIGHT_EMAIL}`} className="underline">
                {ONSIGHT_EMAIL}
              </a>{" "}
              <span className="px-1">|</span>
              <a href={`tel:${ONSIGHT_PHONE}`} className="underline">
                {ONSIGHT_PHONE}
              </a>
            </div>
          </details>
        ) : null}
        {showPrintDepartmentEuBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <DepartmentEuBreakdownTable
              rows={estimate.departmentAllowanceBreakdown}
              employeesTotal={estimate.employees}
              allowanceTotal={estimate.allowanceTotal}
            />
          </div>
        ) : null}
        {showPrintDepartmentAllowanceBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <DepartmentAllowanceBreakdownTable
              rows={estimate.departmentAllowanceBreakdown}
              employeesTotal={estimate.employees}
              allowanceTotal={estimate.allowanceTotal}
            />
          </div>
        ) : null}
        {!print && canShowDepartmentAllowanceBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <button
              type="button"
              onClick={toggleDepartmentAllowanceBreakdown}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {showDepartmentAllowanceBreakdown ? "Hide Department Allowance Breakdown" : "Show Department Allowance Breakdown"}
            </button>
            {showDepartmentAllowanceBreakdown ? (
              <DepartmentAllowanceBreakdownTable
                rows={estimate.departmentAllowanceBreakdown}
                employeesTotal={estimate.employees}
                allowanceTotal={estimate.allowanceTotal}
              />
            ) : null}
          </div>
        ) : null}
        {showPrintDepartmentAddOnsBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <DepartmentAddOnsBreakdownTable
              rows={estimate.departmentAllowanceBreakdown}
              alignWithService={showPrintAddOnsServiceAlignmentMode}
            />
          </div>
        ) : null}
        {!print && canShowDepartmentAddOnsBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                toggleDepartmentAddOnsBreakdown();
              }}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {showDepartmentAddOnsBreakdown ? "Hide Department Add-Ons Breakdown" : "Show Department Add-Ons Breakdown"}
            </button>
            {showDepartmentAddOnsBreakdown ? (
              <DepartmentAddOnsBreakdownTable rows={estimate.departmentAllowanceBreakdown} />
            ) : null}
          </div>
        ) : null}
        {estimate.selectedEU === "Covered" && isDepartmentBased ? (
          <details
            className="mt-2 text-xs text-muted-foreground"
            open={showCoveredClarification}
            onToggle={(event) => setShowCoveredClarification(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-foreground/80">Need clarification? See how Covered allowance works.</summary>
            <div className="mt-2 space-y-2 leading-relaxed">
              <div>
                The Covered EU Package means employees have the base allowance of Complete and can choose{" "}
                <span className="italic">any</span> combination of any included add-ons.
              </div>
              <div className="text-[11px] leading-relaxed">
                *Disclaimer: Lens pairing and configuration logic still apply. Blue Light + Anti-Reflective cannot be combined
                with standard Anti-Reflective, and Polarized Sun Glasses + Transitions should be selected as Transitions
                Polarized.
              </div>
              <div>
                <span className="font-medium text-foreground">Allowance Total</span> is the configured base coverage.
              </div>
              <div>
                <span className="font-medium text-foreground">Allowance Total (Available)</span> reflects the full-coverage
                package value when included add-ons are maximized within lens compatibility rules.
              </div>
              <div>
                Department-based mode uses each department&apos;s configured allowance as the base. Use the Department
                Allowance Breakdown for each department&apos;s totals.
              </div>
              <div>Contact an OSSO Program Specialist:</div>
            </div>
            <div className="mt-1">
              <a href={`mailto:${ONSIGHT_EMAIL}`} className="underline">
                {ONSIGHT_EMAIL}
              </a>{" "}
              <span className="px-1">|</span>
              <a href={`tel:${ONSIGHT_PHONE}`} className="underline">
                {ONSIGHT_PHONE}
              </a>
            </div>
          </details>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-background p-3">
        <div className="text-sm font-semibold text-foreground">{`Service Tier: ${estimate.selectedTier || "Not Selected"}`}</div>
        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
          <div>
            {"Employees (Total)"}:{" "}
            <span className="font-medium text-foreground">{estimate.employees}</span>
          </div>
          <div>
            Service per Employee:{" "}
            <span className="font-medium text-foreground">{formatMoney(estimate.servicePerEmployee)}</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Service Total: <span className="font-medium text-foreground">{formatMoney(estimate.serviceTotal)}</span>
        </div>

        {showPrintDepartmentServiceBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
              <DepartmentServiceBreakdownTable
                rows={departmentServiceBreakdown}
                employeesTotal={estimate.employees}
                serviceTotal={estimate.serviceTotal}
                alignWithEuCombined={showPrintDepartmentEuBreakdown}
                alignWithAddOnsOnly={showPrintAddOnsServiceAlignmentMode}
              />
            </div>
          ) : null}
        {!print && canShowDepartmentServiceBreakdown ? (
          <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3`}>
            <button
              type="button"
              onClick={toggleDepartmentServiceBreakdown}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {showDepartmentServiceBreakdown
                ? "Hide Department Service Tier Breakdown"
                : "Show Department Service Tier Breakdown"}
            </button>
            {showDepartmentServiceBreakdown ? (
              <DepartmentServiceBreakdownTable
                rows={departmentServiceBreakdown}
                employeesTotal={estimate.employees}
                serviceTotal={estimate.serviceTotal}
                alignWithEuCombined={false}
              />
            ) : null}
          </div>
        ) : null}
      </div>

    </div>
    );
  };

  const OnboardingFeesCard = ({ print }: { print: boolean }) => (
    <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Onboarding</div>
      <div className={rowTextClass}>
        <div>
          Additional Locations: <span className="font-medium text-foreground">{estimate.additionalSitesCount}</span>
        </div>
        <div>
          Total Locations: <span className="font-medium text-foreground">{estimate.locationCount}</span>
        </div>
        <div>
          Base Onboarding Setup: <span className="font-medium text-foreground">{formatMoney(estimate.onboardingBase)}</span>
        </div>
        <div>
          Per Additional Location Setup:{" "}
          <span className="font-medium text-foreground">{formatMoney(estimate.onboardingAdditionalSitesFeePerSite)}</span>
        </div>
        <div className="pt-2">
          Onboarding Total: <span className="font-medium text-foreground">{formatMoney(estimate.onboardingFee)}</span>
        </div>
      </div>
    </div>
  );

  const PaymentTermsCard = ({ print }: { print: boolean }) => {
    const departmentDiscountBreakdown = estimate.departmentAllowanceBreakdown.map((row) => {
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

    const departmentInvoiceBreakdown = estimate.departmentAllowanceBreakdown.map((row) => {
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

    const showDepartmentDiscountBreakdown =
      isDepartmentBased && estimate.discountPct > 0 && departmentDiscountBreakdown.length > 0;

    const showDepartmentInvoiceBreakdown =
      isDepartmentBased && estimate.discountPct === 0 && departmentInvoiceBreakdown.length > 0;

    const showDepartmentInvoiceFees = estimate.financeFeePerInvoice > 0;

    const showDepartmentPaymentBreakdownToggle =
      showDepartmentDiscountBreakdown || showDepartmentInvoiceBreakdown;
    const showPrintDepartmentPaymentBreakdown =
      print && showDepartmentPaymentBreakdownToggle && showDepartmentPaymentBreakdown;

    const departmentPaymentBreakdownLabel = showDepartmentDiscountBreakdown
      ? "Show Department Discount Breakdown"
      : "Show Department Invoice Breakdown";

    const isNet30 = estimate.paymentTerms === "NET30";
    const hasMaxDiscount = estimate.discountPct > 0;
    const invoiceTotalWithMaxDiscount = estimate.invoiceTotal - estimate.discountTotalMax + estimate.financeFeeTotal;
    const showCoveredBaseAllowanceNote =
      calculator.selectedEU === "Covered" ||
      estimate.selectedEU === "Covered" ||
      estimate.coveredExampleFloorPerEmployee > 0;
    const invoiceTotalSummaryLabel = hasMaxDiscount ? "Invoice Total (With Max Discount)" : "Invoice Total (With Fees)";
    const invoiceTotalBeforeLabel = estimate.financeFeePerInvoice > 0 ? "Invoice Total (Before Fees)" : "Invoice Total (Before Discount)";
    const paymentTermsHeaderLabel = `Payment Terms: ${estimate.paymentTerms || "Not Selected"}`;

    return (
      <div className={print ? subtleCardPrintClass : subtleCardClass}>
        <div className={cardTitleClass}>{paymentTermsHeaderLabel}</div>
        {isDepartmentBased ? (
          <>
            <div className={rowTextClass}>
              <div>
                Employees (Total): <span className="font-medium text-foreground">{estimate.employees}</span>
              </div>
              {!isNet30 ? (
                <div>
                  Finance Fee Total: <span className="font-medium text-foreground">{formatMoney(estimate.financeFeeTotal)}</span>
                </div>
              ) : null}
              {hasMaxDiscount ? (
                <div>
                  Maximum Possible Discount Total:{" "}
                  <span className="font-medium text-foreground">{formatMoneyCents(estimate.discountTotalMax)}</span>
                </div>
              ) : null}
            </div>
            {isNet30 ? (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {hasMaxDiscount ? (
                  <>
                    <div>
                      Invoice Total (Before Discount):{" "}
                      <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                    </div>
                    <div>
                      Invoice Total (With Max Discount):{" "}
                      <span className="font-medium text-foreground">{formatMoneyCents(invoiceTotalWithMaxDiscount)}</span>
                    </div>
                  </>
                ) : (
                  <div>
                    Invoice Total: <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div>
                  {invoiceTotalBeforeLabel}:{" "}
                  <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                </div>
                {hasMaxDiscount ? (
                  <div>
                    Maximum Possible Discount Total:{" "}
                    <span className="font-medium text-foreground">{formatMoneyCents(estimate.discountTotalMax)}</span>
                  </div>
                ) : null}
                <div>
                  {invoiceTotalSummaryLabel}:{" "}
                  <span className="font-medium text-foreground">{formatMoneyCents(invoiceTotalWithMaxDiscount)}</span>
                </div>
              </div>
            )}

            {showPrintDepartmentPaymentBreakdown ? (
              <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3 rounded-md border border-border bg-background p-3`}>
                {showDepartmentDiscountBreakdown ? (
                  <DepartmentDiscountBreakdownTable rows={departmentDiscountBreakdown} />
                ) : showDepartmentInvoiceBreakdown ? (
                  <DepartmentInvoiceBreakdownTable rows={departmentInvoiceBreakdown} showFees={showDepartmentInvoiceFees} />
                ) : null}
              </div>
            ) : null}
            {!print && showDepartmentPaymentBreakdownToggle ? (
              <div className={`${PRINT_KEEP_TOGETHER_CLASSES.breakdownBlock} mt-3 rounded-md border border-border bg-background p-3`}>
                <button
                  type="button"
                  onClick={toggleDepartmentPaymentBreakdown}
                  className="text-sm font-medium text-foreground underline underline-offset-4"
                >
                  {showDepartmentPaymentBreakdown ? "Hide Department Payment Breakdown" : departmentPaymentBreakdownLabel}
                </button>
                {showDepartmentPaymentBreakdown ? (
                  showDepartmentDiscountBreakdown ? (
                    <DepartmentDiscountBreakdownTable rows={departmentDiscountBreakdown} />
                  ) : showDepartmentInvoiceBreakdown ? (
                    <DepartmentInvoiceBreakdownTable rows={departmentInvoiceBreakdown} showFees={showDepartmentInvoiceFees} />
                  ) : null
                ) : null}
              </div>
            ) : null}
            {hasMaxDiscount ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Discount is shown as a maximum based on the per Employee invoice amount. Total discount scales with your employee count.
                Actual discount can be lower if some pairs price below the per Employee allowance.
              </div>
            ) : null}
            {showCoveredBaseAllowanceNote ? (
              <div className="mt-3 text-xs text-muted-foreground">Estimates show base allowance totals only.</div>
            ) : null}
          </>
        ) : (
          <>
            <div className={rowTextClass}>
              <div>
                Employees (Total): <span className="font-medium text-foreground">{estimate.employees}</span>
              </div>
              {!isNet30 ? (
                <div>
                  Finance Fee per Invoice:{" "}
                  <span className="font-medium text-foreground">{formatMoney(estimate.financeFeePerInvoice)}</span>
                </div>
              ) : null}
              {!isNet30 ? (
                <div>
                  Finance Fee Total: <span className="font-medium text-foreground">{formatMoney(estimate.financeFeeTotal)}</span>
                </div>
              ) : null}
              {!isNet30 ? (
                <div>
                  Payment Discount:{" "}
                  <span className="font-medium text-foreground">
                    {estimate.discountAllowed ? discountLabel(estimate.paymentDiscount) : "Not Available For Selected Terms"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>
                Invoice Amount per Employee:{" "}
                <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoicePerEmployee)}</span>
              </div>
              {hasMaxDiscount ? (
                <>
                  <div>
                    Max Possible Discount per Invoice:{" "}
                    <span className="font-medium text-foreground">{formatMoneyCents(estimate.discountPerEmployeeMax)}</span>
                  </div>
                  <div>
                    Maximum Possible Discount Total:{" "}
                    <span className="font-medium text-foreground">{formatMoneyCents(estimate.discountTotalMax)}</span>
                  </div>
                </>
              ) : null}
            </div>
            {isNet30 ? (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {hasMaxDiscount ? (
                  <>
                    <div>
                      Invoice Total (Before Discount):{" "}
                      <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                    </div>
                    <div>
                      Invoice Total (With Max Discount):{" "}
                      <span className="font-medium text-foreground">{formatMoneyCents(invoiceTotalWithMaxDiscount)}</span>
                    </div>
                  </>
                ) : (
                  <div>
                    Invoice Total: <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div>
                  {invoiceTotalBeforeLabel}:{" "}
                  <span className="font-medium text-foreground">{formatMoneyCents(estimate.invoiceTotal)}</span>
                </div>
                {hasMaxDiscount ? (
                  <div>
                    Maximum Possible Discount Total:{" "}
                    <span className="font-medium text-foreground">{formatMoneyCents(estimate.discountTotalMax)}</span>
                  </div>
                ) : null}
                <div>
                  {invoiceTotalSummaryLabel}:{" "}
                  <span className="font-medium text-foreground">{formatMoneyCents(invoiceTotalWithMaxDiscount)}</span>
                </div>
              </div>
            )}

            {hasMaxDiscount ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Discount is shown as a maximum based on the per Employee invoice amount. Total discount scales with your employee count.
                Actual discount can be lower if some pairs price below the per Employee allowance.
              </div>
            ) : null}
            {showCoveredBaseAllowanceNote ? (
              <div className="mt-3 text-xs text-muted-foreground">Estimates show base allowance totals only.</div>
            ) : null}
          </>
        )}
      </div>
    );
  };

  const EstimateNoticeCard = ({ print }: { print: boolean }) => (
    <div className={print ? subtleCardPrintClass : subtleCardClass}>
      <div className={cardTitleClass}>Estimate Notice</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        This quote preview provides an estimate. Final pricing and program scope are confirmed after On-Sight Safety
        Optics reviews your locations, onsite requirements, hazard and compliance needs, frame and lens requirements,
        travel distance, and support coverage.
      </p>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Supplemental requests, including additional products, services, reporting, special handling, or policy
        exceptions, are scoped and priced separately. For coverage, timelines, and total cost, review this estimate
        with an OSSO Program Specialist before treating it as final.
      </p>
    </div>
  );

  const TotalEstimateCard = ({ print }: { print: boolean }) => {
    const departmentAllowanceSummary = departmentAllowanceSummaryValues(estimate.departmentAllowanceBreakdown);
    const departmentAllowanceSummaryVisible = departmentAllowanceSummary.slice(0, 5);
    const departmentAllowanceSummaryHiddenCount = Math.max(0, departmentAllowanceSummary.length - departmentAllowanceSummaryVisible.length);
    const departmentInvoicePerEmployeeSummary = departmentInvoicePerEmployeeValues(
      estimate.departmentAllowanceBreakdown,
      estimate.servicePerEmployee
    );
    const departmentInvoicePerEmployeeVisible = departmentInvoicePerEmployeeSummary.slice(0, 5);
    const departmentInvoicePerEmployeeHiddenCount = Math.max(
      0,
      departmentInvoicePerEmployeeSummary.length - departmentInvoicePerEmployeeVisible.length
    );

    return (
      <div className={print ? subtleCardPrintClass : subtleCardClass}>
        <div className={cardTitleClass}>Total Estimate</div>

      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-4">
          <div>Onboarding Fees</div>
          <div className="font-medium text-foreground">{formatMoney(estimate.onboardingFee)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Allowance Total</div>
          <div className="font-medium text-foreground">{formatMoney(estimate.allowanceTotal)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Service Total</div>
          <div className="font-medium text-foreground">{formatMoney(estimate.serviceTotal)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Additional Onsite Visits</div>
          <div className="font-medium text-foreground">{formatMoney(estimate.extraVisitsFee)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Travel Surcharge</div>
          <div className="font-medium text-foreground">{formatMoneyCents(estimate.travelTotal)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Finance Fees</div>
          <div className="font-medium text-foreground">{formatMoney(estimate.financeFeeTotal)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>Maximum Possible Discount Total</div>
          <div className="font-medium text-foreground">{formatMoneyCents(estimate.discountTotalMax)}</div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2">
          <div className="text-base font-semibold text-foreground">Grand Total Estimate</div>
          <div className="text-xl font-semibold text-foreground">{formatMoneyCents(estimate.grandTotal)}</div>
        </div>
      </div>

        <div className="mt-4 text-xs text-muted-foreground">
          {isDepartmentBased && departmentAllowanceSummaryVisible.length > 0 ? (
            <>
              <span>Allowance per Employee: </span>
              {departmentAllowanceSummaryVisible.map((allowancePerEmployee, index) => (
                <span key={`allowance-${index}-${allowancePerEmployee}`}>
                  <span className="font-medium text-foreground">{formatMoney(allowancePerEmployee)}</span>
                  {index < departmentAllowanceSummaryVisible.length - 1 ? ", " : ""}
                </span>
              ))}
              {departmentAllowanceSummaryHiddenCount > 0 ? ` +${departmentAllowanceSummaryHiddenCount} more (see breakdown)` : ""}
              <span className="px-2">|</span>
            </>
          ) : (
            <>
              Allowance per Employee: <span className="font-medium text-foreground">{formatMoney(estimate.allowancePerEmployee)}</span>
              <span className="px-2">|</span>
            </>
          )}
          Service per Employee:{" "}
          <span className="font-medium text-foreground">{formatMoney(estimate.servicePerEmployee)}</span>
          <span className="px-2">|</span>
          {isDepartmentBased && departmentInvoicePerEmployeeVisible.length > 0 ? (
            <>
              <span>Invoice per Employee: </span>
              {departmentInvoicePerEmployeeVisible.map((invoicePerEmployee, index) => (
                <span key={`invoice-${index}-${invoicePerEmployee}`}>
                  <span className="font-medium text-foreground">{formatMoney(invoicePerEmployee)}</span>
                  {index < departmentInvoicePerEmployeeVisible.length - 1 ? ", " : ""}
                </span>
              ))}
              {departmentInvoicePerEmployeeHiddenCount > 0 ? ` +${departmentInvoicePerEmployeeHiddenCount} more (see breakdown)` : ""}
            </>
          ) : (
            <>
              Invoice per Employee:{" "}
              <span className="font-medium text-foreground">{formatMoney(estimate.invoicePerEmployee)}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const guidanceId = "quote-guidance";
  const guidanceMessage = useMemo(() => {
    if (envValidationMessage) return envValidationMessage;
    if (submitValidationMessage) return submitValidationMessage;
    return "Review the preview, then download a PDF or submit the quote when ready.";
  }, [envValidationMessage, submitValidationMessage]);

  const submitDisabled = isSubmitting || Boolean(envValidationMessage) || Boolean(submitValidationMessage);
  const [showDepartmentAllowanceBreakdown, setShowDepartmentAllowanceBreakdown] = useState(false);
  const [showDepartmentAddOnsBreakdown, setShowDepartmentAddOnsBreakdown] = useState(false);
  const [showDepartmentServiceBreakdown, setShowDepartmentServiceBreakdown] = useState(false);
  const [showDepartmentPaymentBreakdown, setShowDepartmentPaymentBreakdown] = useState(false);
  const [showCoveredClarification, setShowCoveredClarification] = useState(false);
  const toggleWithScrollLock = useCallback((setter: (fn: (prev: boolean) => boolean) => void) => {
    const currentScrollY = window.scrollY;
    setter((prev) => !prev);
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - currentScrollY) > 1) {
        window.scrollTo({ top: currentScrollY, left: 0, behavior: "auto" });
      }
    });
  }, []);
  const toggleDepartmentAllowanceBreakdown = useCallback(
    () => toggleWithScrollLock(setShowDepartmentAllowanceBreakdown),
    [toggleWithScrollLock]
  );
  const toggleDepartmentAddOnsBreakdown = useCallback(
    () => toggleWithScrollLock(setShowDepartmentAddOnsBreakdown),
    [toggleWithScrollLock]
  );
  const toggleDepartmentServiceBreakdown = useCallback(
    () => toggleWithScrollLock(setShowDepartmentServiceBreakdown),
    [toggleWithScrollLock]
  );
  const toggleDepartmentPaymentBreakdown = useCallback(
    () => toggleWithScrollLock(setShowDepartmentPaymentBreakdown),
    [toggleWithScrollLock]
  );

  return (
    <section aria-labelledby="quote-title">
       <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.32in;
          }

          body {
            background: var(--color-background) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          header.no-print,
          .app-shell-header,
          [data-pdf-exclude="true"],
          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
            position: relative;
            z-index: 1;
          }

          .print-hide {
            display: none !important;
          }

          .print-page {
            width: 100%;
            margin: 0 auto;
          }

          .print-page-break {
            break-after: page;
            page-break-after: always;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .quote-print-header {
            padding: 8px 10px;
          }

          .quote-print-card {
            padding: 7px 7px;
          }

          .quote-print-body {
            padding: 8px 8px;
          }

          .quote-print-body .text-sm {
            font-size: 11px !important;
            line-height: 1.15rem !important;
          }

          .quote-print-body .text-xs {
            font-size: 10px !important;
            line-height: 1.0rem !important;
          }

          .quote-print-header {
            background: #ffffff;
            border-bottom: 1px solid #d6dce8;
          }

          .quote-print-body {
            background: #ffffff;
          }

          .quote-print-card {
            border: 1px solid #d6dce8;
            background: #f7f8fb;
            border-radius: 12px;
          }

          .print-only .quote-print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .quote-print-gap {
            gap: 10px;
          }

          .quote-print-stack {
            gap: 8px;
          }

          .print-only .breakdown-table {
            width: 100%;
            table-layout: fixed;
          }

          .print-only .breakdown-table th,
          .print-only .breakdown-table td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
            vertical-align: top;
          }

          .print-only .breakdown-table .breakdown-col-dept {
            width: 170px;
          }

          .print-only .breakdown-table th.breakdown-col-dept,
          .print-only .breakdown-table td.breakdown-col-dept {
            padding-right: 10px !important;
          }

          .print-only .breakdown-table .breakdown-col-employees {
            width: 88px;
            text-align: right;
          }

          .print-only .breakdown-table th.breakdown-col-employees,
          .print-only .breakdown-table td.breakdown-col-employees {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          .print-only .breakdown-table .breakdown-col-addons {
            word-break: break-word;
            line-height: 1.25;
          }

          .print-only .breakdown-table .breakdown-col-value {
            width: 122px;
            text-align: right;
          }

          .print-only .breakdown-table .breakdown-col-percent {
            width: 90px;
            text-align: right;
          }

          .print-only .breakdown-table .breakdown-col-total {
            width: 122px;
            text-align: right;
          }

          .print-only .breakdown-table .breakdown-col-num {
            font-variant-numeric: tabular-nums;
          }

          .print-only .department-eu-breakdown-table th,
          .print-only .department-eu-breakdown-table td {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
          }

          .print-only .department-eu-breakdown-table .department-eu-employees {
            padding-right: 18px !important;
          }

          .print-only .department-eu-breakdown-table .department-eu-addons {
            padding-left: 18px !important;
          }

          .quote-print-body table td,
          .quote-print-body table th {
            color: #0f172a !important;
          }

          .print-doc {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .print-doc thead {
            display: table-header-group;
          }

          .print-doc tbody {
            display: table-row-group;
          }

          .print-doc > thead > tr > td,
          .print-doc > tbody > tr > td {
            padding: 0;
            vertical-align: top;
          }

          .print-doc-body {
            padding-top: 8px;
          }

          .print-section-stack {
            display: grid;
            gap: 8px;
          }

          .print-section {
            break-inside: auto;
            page-break-inside: auto;
          }

          .print-only .text-sm {
            font-size: 11px !important;
            line-height: 1.15rem !important;
          }

          .print-only .text-xs {
            font-size: 10px !important;
            line-height: 1rem !important;
          }

          .print-only .text-lg {
            font-size: 19px !important;
            line-height: 1.35rem !important;
          }

          .print-only table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-only .print-location-item,
          .print-only .print-location-summary,
          .print-only .print-breakdown-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-only .print-section-header {
            break-after: avoid;
            page-break-after: avoid;
          }

          .print-only .print-section-lead {
            break-before: avoid;
            page-break-before: avoid;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-only .print-financial-group {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-only .print-force-page-start {
            break-before: page;
            page-break-before: always;
          }
        }

        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>



      <div className="no-print">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div data-pdf-exclude="true" className="py-10">
            <h1 id="quote-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Quote Preview
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Review your full estimate, confirm scope and totals, then print or submit the quote when everything is ready.
            </p>
          </div>

          <SectionWrap>
            <LiveGuidance id={guidanceId} message={guidanceMessage} />

            <div
              data-pdf-exclude="true"
              className="flex flex-col gap-3 lg:flex-row lg:items-center"
              aria-describedby={guidanceId}
            >
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <button type="button" onClick={() => nav("calculator", "internal")} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                  Back to Program Calculator
                </button>
                <button type="button" onClick={() => nav("builder", "internal")} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                  Back to Program Builder
                </button>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:ml-auto lg:w-auto">
                <button type="button" onClick={printQuoteTwoPages} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                  Print Page as PDF
                </button>

                {ENABLE_QUOTE_SUBMIT ? (
                  <button type="button" onClick={submitQuote} className={`${primaryButtonClass} w-full sm:w-auto`} disabled={submitDisabled}>
                    {isSubmitting ? "Submitting..." : "Submit Quote"}
                  </button>
                ) : null}
              </div>
            </div>

            {actionMessage ? (
              <div
                data-pdf-exclude="true"
                className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground"
                role="status"
                aria-live="polite"
              >
                {actionMessage}
              </div>
            ) : null}

            {/* Developer verification steps:
                1. Fill Builder fields, including newly added inputs.
                2. Continue to Calculator and fill all inputs, including newly added inputs.
                3. Continue to Quote Preview and confirm every value is shown.
                4. Refresh the page and confirm values are still present from storage.
            */}
            {import.meta.env.DEV ? (
              <div data-pdf-exclude="true" className="mt-4 rounded-md border border-border bg-card p-3">
                <button
                  type="button"
                  onClick={() => setShowDraftDiagnostics((prev) => !prev)}
                  className={secondaryButtonClass}
                >
                  {showDraftDiagnostics ? "Hide Draft Diagnostics" : "Show Draft Diagnostics"}
                </button>
                {showDraftDiagnostics ? (
                  <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}

            <div
              id="quote-pdf-root"
              data-pdf-root="quote"
              data-pdf-header="quote"
              className="mt-10 overflow-hidden rounded-lg border border-border bg-card"
            >
              <QuoteHeader tight={false} />

                                  <div className="space-y-5 px-4 pb-6 sm:px-6">
                      <div className="grid grid-cols-12 items-stretch gap-4">
                      <div className="col-span-12 space-y-4 md:col-span-7">
                        <ContactDetailsCard print={false} />
                        <ProgramGuidelinesCard print={false} />
                        <NotesCard print={false} />
                        <CompactSelectedOptionsCard print={false} />
                        <LocationsCard print={false} />
                      </div>

                      <div className="col-span-12 flex h-full flex-col gap-4 md:col-span-5">
                        <ProgramInputsCard print={false} />
                        <OnboardingFeesCard print={false} />
                        <PaymentTermsCard print={false} />

                        <div className="flex-1" />

                        <TotalEstimateCard print={false} />
                      </div>
                    </div>
                    <EstimateNoticeCard print={false} />
                    <div data-pdf-exclude="true" className="grid gap-2 pt-3 sm:grid-cols-2 sm:justify-end sm:gap-3 md:flex md:flex-wrap md:items-center md:justify-end">
                      <button type="button" onClick={printQuoteTwoPages} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                        Print Page as PDF
                      </button>
                      {ENABLE_QUOTE_SUBMIT ? (
                        <button
                          type="button"
                          onClick={submitQuote}
                          className={`${primaryButtonClass} w-full sm:w-auto`}
                          disabled={submitDisabled}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Quote"}
                        </button>
                      ) : null}
                    </div>

                  </div>

            </div>
          </SectionWrap>
        </div>
      </div>

      <div className="print-only">
        <table className="print-doc">
          <thead>
            <tr>
              <td>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <QuoteHeader tight={true} />
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="print-doc-body print-section-stack">
                  <div className="print-section">
                    <div className="grid grid-cols-12 quote-print-gap">
                      <div className="col-span-12 md:col-span-7">
                        <div className="grid quote-print-stack">
                          <div className="print-avoid-break">
                            <ContactDetailsCard print={true} />
                          </div>
                          <div className="print-avoid-break">
                            <ProgramGuidelinesCard print={true} />
                          </div>
                          {guidelines.notes?.trim() ? (
                            <div className="print-avoid-break">
                              <NotesCard print={true} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <div className="grid quote-print-stack">
                          <div className="print-avoid-break">
                            <CompactSelectedOptionsCard print={true} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="print-section print-avoid-break">
                    <LocationsCard print={true} />
                  </div>

                  <div className="print-section">
                    <div className="grid grid-cols-12 quote-print-gap">
                      <div className="col-span-12 md:col-span-6">
                        <div className="print-avoid-break">
                          <ProgramInputsCard print={true} />
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <div className="print-financial-group space-y-3">
                          <div className="print-avoid-break">
                            <OnboardingFeesCard print={true} />
                          </div>
                          <div className="print-avoid-break">
                            <PaymentTermsCard print={true} />
                          </div>
                          <div className="print-avoid-break">
                            <TotalEstimateCard print={true} />
                          </div>
                          <div className="print-avoid-break">
                            <EstimateNoticeCard print={true} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </section>
  );
}
