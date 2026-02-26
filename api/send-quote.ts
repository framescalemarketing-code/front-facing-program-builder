/* global fetch */

/* Serverless function for Vercel to email submitted quotes via Resend.
   Environment variables:
   - RESEND_API_KEY (required): secret API key from https://resend.com
   - FROM_EMAIL (required): verified sender, e.g., "quotes@yourdomain.com"
   - TO_EMAIL (optional): comma-separated list of recipients (default: framescalemarketing@framescalemarketing.com)
   - RESEND_TEST_MODE (optional): "true" forces onboarding sender/recipient for sandbox testing
*/

const EMAIL_ADD_ON_ITEMS = [
  { key: "antiFog", label: "Anti Fog", amount: 50 },
  { key: "antiReflectiveStd", label: "Anti Reflective Standard", amount: 55 },
  { key: "blueLightAntiReflective", label: "Blue Light + Anti-Reflective Coating", amount: 100 },
  { key: "extraScratchCoating", label: "Extra Scratch Coating", amount: 50 },
  { key: "polarized", label: "Polarized", amount: 135 },
  { key: "tint", label: "Tint", amount: 40 },
  { key: "transitions", label: "Transitions", amount: 135 },
  { key: "transitionsPolarized", label: "Transitions Polarized", amount: 165 },
];

const EMAIL_ENHANCEMENT_ITEMS = [
  { key: "blueLight", label: "Blue Light Filter", amount: 50 },
  { key: "extraSideShields", label: "Extra Side Shields", amount: 0 },
  { key: "hiIndex", label: "Hi Index", amount: 0 },
  { key: "residentialShip", label: "Residential Shipping", amount: 0 },
  { key: "rollAndPolish", label: "Roll And Polish", amount: 0 },
  { key: "trivex", label: "Trivex", amount: 0 },
];

const EMAIL_SERVICE_FEE_ITEMS = [
  { key: "additionalBulkShipWeekly", label: "Additional Bulk Ship Weekly", amount: 25 },
  { key: "additionalServiceDeliveryVisit", label: "Additional Service And Delivery Visit", amount: 25 },
  { key: "advancedReporting", label: "Advanced Dashboard And Reporting", amount: 50 },
  { key: "customReportsByRequest", label: "Custom Reports By Request", amount: 0 },
  { key: "supplementSpecialtyPackageOptions", label: "Supplement Specialty Package Options", amount: 0 },
  { key: "whiteGloveImplementation", label: "White Glove Implementation", amount: 0 },
];

type QuotePayload = {
  quoteId?: string;
  createdAtIso?: string;
  showroomReference?: string;
  draft?: DraftData;
  estimate?: EstimateData;
  additionalRecipients?: string[];
  pdfBase64?: string;
  pdfFilename?: string;
};

type JsonMap = Record<string, unknown>;
type HeaderValue = string | string[] | undefined;

type RequestLike = {
  method?: string;
  headers?: Record<string, HeaderValue>;
  body?: unknown;
  on?: (event: string, listener: (arg?: unknown) => void) => void;
};

type ResponseLike = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

type ContactData = {
  companyName?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
} & JsonMap;

type LocationData = {
  streetAddress?: unknown;
  city?: unknown;
  state?: unknown;
  label?: unknown;
  address?: unknown;
  oneWayMiles?: unknown;
  totalVisits?: unknown;
  total?: unknown;
} & JsonMap;

type CalculatorData = {
  contact?: ContactData;
  locations?: LocationData[];
  addOns?: {
    euPackageAddOns?: Record<string, boolean | undefined>;
    euEnhancements?: Record<string, boolean | undefined>;
    additionalServiceFees?: Record<string, boolean | undefined>;
  };
  selectedEU?: unknown;
  selectedTier?: unknown;
  eligibleEmployees?: unknown;
  paymentTerms?: unknown;
  paymentDiscount?: unknown;
} & JsonMap;

type GuidelinesData = {
  sideShieldType?: unknown;
  eligibilityFrequency?: unknown;
  hsaFsaAvailable?: unknown;
  approvalWorkflowEnabled?: unknown;
  allowEmployeePayOverAllowance?: unknown;
  allowEmployeePayUpgradesOutsideCoverage?: unknown;
  restrictions?: {
    noSunglasses?: unknown;
    noTransitions?: unknown;
    noMetal?: unknown;
    noCoatings?: unknown;
  } & JsonMap;
  notes?: unknown;
} & JsonMap;

type EstimateData = {
  travelByLocation?: LocationData[];
} & JsonMap;

type DraftData = {
  calculator?: CalculatorData;
  builder?: {
    guidelines?: GuidelinesData;
  } & JsonMap;
} & JsonMap;

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  let testMode = false;
  let quoteId: string | null = null;
  const requestId = getRequestId(req);

  try {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    const resendApiKey = getServerEnv("RESEND_API_KEY");
    const fromEmail = getServerEnv("FROM_EMAIL");
    testMode = getServerEnv("RESEND_TEST_MODE").toLowerCase() === "true";
    const defaultRecipients = (getServerEnv("TO_EMAIL") || "framescalemarketing@framescalemarketing.com")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (!resendApiKey) return sendMissingEnvError(res, "RESEND_API_KEY");
    if (!fromEmail) return sendMissingEnvError(res, "FROM_EMAIL");

    const parsedBody = await readRequestJson(req);
    if (parsedBody.ok === false) {
      return sendJson(res, 400, { error: "Invalid JSON payload", detail: parsedBody.error });
    }
    const body = parsedBody.body;
    if (body == null) return sendJson(res, 400, { error: "Invalid JSON payload" });

    const payload = body as QuotePayload;
    const recipients = uniqueEmails([...defaultRecipients, ...(payload.additionalRecipients ?? [])]);
    if (!recipients.length) return sendJson(res, 500, { error: "No recipients configured" });

    const validationError = validatePayload(payload);
    if (validationError) return sendJson(res, 400, { error: validationError });

    if (!payload.pdfBase64 || !payload.pdfFilename) {
      return sendJson(res, 400, {
        error: "Missing PDF attachment",
        detail: "Provide both pdfBase64 (no data: prefix) and pdfFilename to send the quote email.",
      });
    }

    const contact: ContactData = payload.draft?.calculator?.contact ?? {};
    const calculator: CalculatorData = payload.draft?.calculator ?? {};
    const guidelines: GuidelinesData = payload.draft?.builder?.guidelines ?? {};
    const estimate: EstimateData = payload.estimate ?? {};

    const subject = buildSubject(payload, contact);
    const text = buildText(payload, contact, calculator, guidelines, estimate);
    const html = buildHtml(payload, contact, calculator, guidelines, estimate);
    quoteId = payload.quoteId ?? null;

    const sendFrom = testMode ? "OSSO Quotes <onboarding@resend.dev>" : fromEmail;
    const sendTo = testMode ? ["framescalemarketing@framescalemarketing.com"] : recipients;
    const sendSubject = testMode ? `[QUOTE TEST] ${subject}` : subject;

    const replyTo = contact.email && isEmail(contact.email) ? [contact.email.trim()] : undefined;

    const attachments =
      payload.pdfBase64 && payload.pdfFilename
        ? [
            {
              filename: payload.pdfFilename,
              content: payload.pdfBase64,
              content_type: "application/pdf",
              content_id: "quote-pdf",
            },
          ]
        : undefined;

    console.info(
      JSON.stringify({
        event: "quote_email_send_attempt",
        testMode,
        from: sendFrom,
        to: sendTo,
        subject: sendSubject,
        quoteId,
        requestId,
      })
    );

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sendFrom,
        to: sendTo,
        subject: sendSubject,
        text,
        html,
        reply_to: replyTo,
        attachments,
      }),
    });

    const sendResponseText = await sendResponse.text();

    if (!sendResponse.ok) {
      const detail = safeText(sendResponseText);
      console.error(
        JSON.stringify({
          event: "quote_email_send_error",
          testMode,
          from: sendFrom,
          to: sendTo,
          subject: sendSubject,
          quoteId,
          requestId,
          status: sendResponse.status,
          detail,
        })
      );
      return sendJson(res, 500, { error: "Email send failed", detail });
    }

    const messageId = parseResendMessageId(sendResponseText);
    console.info(
      JSON.stringify({
        event: "quote_email_send_success",
        testMode,
        from: sendFrom,
        to: sendTo,
        subject: sendSubject,
        quoteId,
        requestId,
        messageId,
      })
    );

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: "quote_email_send_error",
        testMode,
        quoteId,
        requestId,
        detail,
      })
    );
    return sendJson(res, 500, { error: "Function invocation failed", detail });
  }
}

function buildSubject(payload: QuotePayload, contact: ContactData) {
  const company = contact.companyName || "Prospect";
  const idPart = payload.quoteId ? ` ${payload.quoteId}` : "";
  return `On-Sight Safety Optics Quote${idPart} - ${company}`;
}

function buildText(
  payload: QuotePayload,
  contact: ContactData,
  calculator: CalculatorData,
  guidelines: GuidelinesData,
  estimate: EstimateData
) {
  const lines: string[] = [];
  lines.push(`Quote ID: ${payload.quoteId ?? "N/A"}`);
  lines.push(`Created: ${payload.createdAtIso ?? "N/A"}`);
  lines.push(`Showroom: ${payload.showroomReference ?? "N/A"}`);
  lines.push("");
  lines.push("Contact");
  lines.push(`- Company: ${safeText(contact.companyName)}`);
  lines.push(`- Name: ${safeText(contact.fullName)}`);
  lines.push(`- Email: ${safeText(contact.email)}`);
  lines.push(`- Phone: ${safeText(contact.phone)}`);
  lines.push("");
  lines.push("Program");
  lines.push(`- EU Package: ${safeText(calculator.selectedEU)}`);
  lines.push(`- Tier: ${safeText(calculator.selectedTier)}`);
  lines.push(`- Eligible Employees: ${calculator.eligibleEmployees ?? "N/A"}`);
  lines.push(`- Payment Terms: ${safeText(calculator.paymentTerms)}`);
  lines.push(`- Payment Discount: ${formatPaymentDiscount(calculator.paymentDiscount)}`);
  lines.push(`- Allowance Per Employee: ${formatMoney(estimate.allowancePerEmployee)}`);
  lines.push(
    `- Service Per Employee: ${formatMoney(
      estimate.servicePerEmployeeIncludingExtraVisits ?? estimate.servicePerEmployee
    )}`
  );
  lines.push(`- Included Visits: ${numberOrNA(estimate.includedVisits)}`);
  lines.push(`- Additional Visits: ${numberOrNA(estimate.extraVisits)}`);
  lines.push(`- Total Visits: ${numberOrNA(estimate.totalVisits)}`);
  lines.push("");
  const selected = deriveSelectedOptions(calculator);
  if (selected.addOns.length || selected.enhancements.length || selected.services.length) {
    lines.push("Selected Options");
    if (selected.addOns.length) {
      lines.push("- EU Package Add Ons:");
      selected.addOns.forEach((o) => lines.push(`  • ${safeText(o.label)}: ${formatMoney(o.amount)}`));
    }
    if (selected.enhancements.length) {
      lines.push("- EU Enhancements:");
      selected.enhancements.forEach((o) => lines.push(`  • ${safeText(o.label)}: ${formatMoney(o.amount)}`));
    }
    if (selected.services.length) {
      lines.push("- Additional Service Fees:");
      selected.services.forEach((o) => lines.push(`  • ${safeText(o.label)}: ${formatMoney(o.amount)}`));
    }
    lines.push("");
  }
  lines.push("Guidelines");
  lines.push(`- Side Shield Type: ${sideShieldLabel(guidelines.sideShieldType)}`);
  lines.push(`- Eligibility Frequency: ${eligibilityFrequencyLabel(guidelines.eligibilityFrequency)}`);
  lines.push(`- HSA/FSA: ${guidelines.hsaFsaAvailable ? "Available" : "Not listed"}`);
  lines.push(`- Approval Workflow: ${guidelines.approvalWorkflowEnabled ? "Enabled" : "Not enabled"}`);
  lines.push(`- Employee Pays Over Allowance: ${guidelines.allowEmployeePayOverAllowance ? "Allowed" : "Not allowed"}`);
  lines.push(
    `- Employee Pays Outside Coverage Upgrades: ${guidelines.allowEmployeePayUpgradesOutsideCoverage ? "Allowed" : "Not allowed"}`
  );
  lines.push(
    `- Restriction - No Sunglasses: ${guidelines.restrictions?.noSunglasses ? "Yes" : "No"}; No Transitions: ${
      guidelines.restrictions?.noTransitions ? "Yes" : "No"
    }; No Metal: ${guidelines.restrictions?.noMetal ? "Yes" : "No"}; No Coatings: ${
      guidelines.restrictions?.noCoatings ? "Yes" : "No"
    }`
  );
  lines.push("");
  lines.push("Totals");
  lines.push(`- Onboarding Fee: ${formatMoney(estimate.onboardingFee)}`);
  lines.push(`- Allowance Total: ${formatMoney(estimate.allowanceTotal)}`);
  lines.push(`- Service Total: ${formatMoney(estimate.serviceTotal)}`);
  lines.push(`- Extra Visits Fee: ${formatMoney(estimate.extraVisitsFee)}`);
  lines.push(`- Travel Surcharge: ${formatMoney(estimate.travelTotal)}`);
  lines.push(`- Finance Fees: ${formatMoney(estimate.financeFeeTotal)}`);
  lines.push(`- Max Discount: ${formatMoney(estimate.discountTotalMax)}`);
  lines.push(`- Grand Total: ${formatMoney(estimate.grandTotal)}`);
  lines.push("");
  lines.push("Locations");
  (estimate.travelByLocation ?? []).forEach((loc: LocationData, idx: number) => {
    lines.push(`  ${idx + 1}. ${safeText(loc.label)} - ${safeText(loc.address)}`);
    lines.push(`     One-way miles: ${formatDecimal(loc.oneWayMiles)}`);
    lines.push(`     Total visits: ${loc.totalVisits ?? "N/A"}`);
    lines.push(`     Travel total: ${formatMoney(loc.total)}`);
  });
  lines.push("");
  return lines.join("\n");
}

function deriveSelectedOptions(calculator: CalculatorData) {
  const addOns =
    EMAIL_ADD_ON_ITEMS.filter((item) => calculator?.addOns?.euPackageAddOns?.[item.key]).map((item) => ({
      label: item.label,
      amount: item.amount,
    })) ?? [];
  const enhancements =
    EMAIL_ENHANCEMENT_ITEMS.filter((item) => calculator?.addOns?.euEnhancements?.[item.key]).map((item) => ({
      label: item.label,
      amount: item.amount,
    })) ?? [];
  const services =
    EMAIL_SERVICE_FEE_ITEMS.filter((item) => calculator?.addOns?.additionalServiceFees?.[item.key]).map((item) => ({
      label: item.label,
      amount: item.amount,
    })) ?? [];
  return { addOns, enhancements, services };
}

function buildHtml(
  payload: QuotePayload,
  contact: ContactData,
  calculator: CalculatorData,
  guidelines: GuidelinesData,
  estimate: EstimateData
) {
  const defaultLogoUrl = "https://raw.githubusercontent.com/framescalemarketing-code/osso-brand-assets/main/osso-logo-horizontal.png";
  const logoEnv = getServerEnv("BRAND_LOGO_URL");
  const logoUrl =
    typeof logoEnv === "string" &&
    (logoEnv.startsWith("http://") || logoEnv.startsWith("https://") || logoEnv.startsWith("data:"))
      ? logoEnv
      : defaultLogoUrl;
  const quoteId = safeText(payload.quoteId);
  const createdAt = formatDateLabel(payload.createdAtIso);
  const showroom = safeText(payload.showroomReference);

  const locationCount =
    typeof estimate.locationCount === "number" && estimate.locationCount > 0
      ? estimate.locationCount
      : Math.max(1, (calculator.locations ?? []).length || 0);
  const allowancePerEmployee = formatMoney(estimate.allowancePerEmployee);
  const servicePerEmployeeFull = formatMoney(
    estimate.servicePerEmployeeIncludingExtraVisits ?? estimate.servicePerEmployee
  );
  const paymentDiscountLabel = formatPaymentDiscount(estimate.paymentDiscount ?? calculator.paymentDiscount);
  const discountAllowed = Boolean(estimate.discountAllowed ?? calculator.paymentTerms === "NET30");
  const maxDiscountLabel = "Max Discount";
  const selectedOptions = deriveSelectedOptions(calculator);

  const headerLogo =
    logoUrl &&
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:0;">
            <img src="${escapeHtml(logoUrl)}" alt="On-Sight Safety Optics" style="height:46px; width:auto; display:block;" />
          </td>
        </tr>
      </table>`;

  const hasPdfAttachment = Boolean(payload.pdfBase64 && payload.pdfFilename);
  const pdfCta = hasPdfAttachment
    ? `<div style="padding:10px 0; text-align:right; color:#244093; font-weight:700; font-size:13px;">PDF attached</div>`
    : "";

  const programRows = [
    infoRow("Eligible Employees", numberOrNA(calculator.eligibleEmployees ?? estimate.employees)),
    infoRow("EU Package", safeText(calculator.selectedEU)),
    infoRow("Service Tier", safeText(calculator.selectedTier)),
    infoRow("Included Visits", numberOrNA(estimate.includedVisits)),
    infoRow("Additional Onsite Visits", numberOrNA(estimate.extraVisits)),
    infoRow("Total Onsite Visits", numberOrNA(estimate.totalVisits)),
    infoRow("Locations", numberOrNA(locationCount)),
  ].join("");

  const guidelineRows = [
    infoRow("Side Shield Type", sideShieldLabel(guidelines.sideShieldType)),
    infoRow("Eligibility Frequency", eligibilityFrequencyLabel(guidelines.eligibilityFrequency)),
    infoRow("HSA/FSA", guidelines.hsaFsaAvailable ? "Available" : "Not Listed"),
    infoRow("Approval Workflow", guidelines.approvalWorkflowEnabled ? "Enabled" : "Not Enabled"),
    infoRow("Employee Pays Over Allowance", guidelines.allowEmployeePayOverAllowance ? "Allowed" : "Not Allowed"),
    infoRow(
      "Employee Pays Outside Coverage Upgrades",
      guidelines.allowEmployeePayUpgradesOutsideCoverage ? "Allowed" : "Not Allowed"
    ),
    infoRow("Restriction - No Sunglasses", guidelines.restrictions?.noSunglasses ? "Yes" : "No"),
    infoRow("Restriction - No Transitions", guidelines.restrictions?.noTransitions ? "Yes" : "No"),
    infoRow("Restriction - No Metal", guidelines.restrictions?.noMetal ? "Yes" : "No"),
    infoRow("Restriction - No Coatings", guidelines.restrictions?.noCoatings ? "Yes" : "No"),
  ].join("");

  const notesHtml =
    typeof guidelines.notes === "string" && guidelines.notes.trim()
      ? `
        <tr>
          <td style="padding:0 0 12px;">
            <div style="font-size:12px; font-weight:700; color:#0f172a; margin-bottom:6px;">Notes</div>
            <div style="border:1px solid #e5e7eb; border-radius:8px; background:#f8fafc; padding:10px 12px; color:#334155; font-size:13px; line-height:1.45;">
              ${escapeHtml(guidelines.notes)}
            </div>
          </td>
        </tr>
      `
      : "";

  const locationRows = (estimate.travelByLocation ?? [])
    .map(
      (loc: LocationData, idx: number) => `
        <tr>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#0f172a;">${idx + 1}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#0f172a;">${escapeHtml(safeText(loc.label))}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#334155;">${escapeHtml(safeText(loc.address || ""))}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#334155;">${escapeHtml(formatDecimal(loc.oneWayMiles))}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#334155;">${escapeHtml(String(loc.totalVisits ?? "N/A"))}</td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#0f172a; font-weight:600;">${escapeHtml(formatMoney(loc.total))}</td>
        </tr>
      `
    )
    .join("");

  const totalsRows = [
    tableRow("Onboarding Fee", formatMoney(estimate.onboardingFee)),
    tableRow("Allowance Total", formatMoney(estimate.allowanceTotal)),
    tableRow("Allowance Per Employee", allowancePerEmployee),
    tableRow("Service Total", formatMoney(estimate.serviceTotal)),
    tableRow("Service Per Employee", servicePerEmployeeFull),
    tableRow("Additional Onsite Visits", formatMoney(estimate.extraVisitsFee)),
    tableRow("Travel Surcharge", formatMoney(estimate.travelTotal)),
    tableRow("Finance Fees", formatMoney(estimate.financeFeeTotal)),
    tableRow(maxDiscountLabel, formatMoney(estimate.discountTotalMax)),
    tableRow("Grand Total", formatMoney(estimate.grandTotal), true),
  ].join("");

  const paymentTermsHtml = `
    <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Payment Terms</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${infoRow("Terms", safeText(estimate.paymentTerms))}
      ${infoRow("Finance Fee Per Employee", formatMoney(estimate.financeFeePerEmployee))}
      ${infoRow(
        "Payment Discount",
        discountAllowed
          ? paymentDiscountLabel
          : "Not Available For Selected Terms"
      )}
      ${infoRow("Discount Per Employee (Max)", formatMoney(estimate.discountPerEmployeeMax))}
      ${infoRow("Max Discount Total (All Employees)", formatMoney(estimate.discountTotalMax))}
    </table>
    <div style="margin-top:10px; font-size:12px; line-height:1.45; color:#64748b;">
      Discount is shown as a maximum based on the per employee invoice amount. Total discount scales with your employee count.
      Actual discount can be lower if some pairs price below the per employee allowance.
    </div>
  `;

  const selectedColumn = (title: string, items: { label: string; amount: number }[]) => {
    if (!items.length) return "";
    return `
      <td style="vertical-align:top; width:33%; padding:0 14px 0 0;">
        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:10px;">${title}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          ${items
            .map(
              (i) => `
            <tr>
              <td style="padding:0 8px 8px 0; font-size:13px; line-height:1.5; color:#0f172a; vertical-align:top; word-break:break-word;">${escapeHtml(
                i.label
              )}</td>
              <td style="padding:0 0 8px 6px; font-size:13px; line-height:1.5; color:#0f172a; font-weight:700; white-space:nowrap; text-align:right; min-width:66px;">${escapeHtml(
                formatMoney(i.amount)
              )}</td>
            </tr>`
            )
            .join("")}
        </table>
      </td>
    `;
  };

  const selectedOptionsHtml =
    selectedOptions.addOns.length || selectedOptions.enhancements.length || selectedOptions.services.length
      ? `
    <div style="border:1px solid #d6dce8; border-radius:12px; background:#ffffff; padding:12px; margin-bottom:14px;">
      <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.04em;">Selected Options</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr>
          ${selectedColumn("EU Package Add Ons", selectedOptions.addOns)}
          ${selectedColumn("EU Enhancements", selectedOptions.enhancements)}
          ${selectedColumn("Additional Service Fees", selectedOptions.services)}
        </tr>
      </table>
    </div>
    `
      : "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:0; padding:0; background:#f2f2f2; font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:860px; border-collapse:collapse; background:#ffffff; border:1px solid #d6dce8; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(0,9,47,0.06);">
            <tr>
              <td style="background:#ffffff; padding:20px 22px; border-bottom:1px solid #d6dce8;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; color:#244093;">
                  <tr>
                    <td valign="middle" style="width:1%; white-space:nowrap;">${headerLogo || ""}</td>
                    <td valign="middle" style="padding-left:14px;">
                      <div style="font-size:22px; font-weight:700; line-height:1.25;">On-Sight Safety Optics Quote</div>
                      <div style="margin-top:6px; font-size:13px; color:#1e3a8a;">Quote ID: ${escapeHtml(quoteId)} | Date: ${escapeHtml(
                        createdAt
                      )}</div>
                      <div style="margin-top:2px; font-size:12px; color:#1e3a8a;">Showroom: ${escapeHtml(showroom)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 22px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:14px;">
                  <tr>
                    <td valign="top" style="width:50%; padding:0 8px 0 0;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#f7f8fb; padding:12px;">
                        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Contact Details</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          ${infoRow("Company Name", safeText(contact.companyName))}
                          ${infoRow("Full Name", safeText(contact.fullName))}
                          ${infoRow("Email", safeText(contact.email))}
                          ${infoRow("Phone", safeText(contact.phone))}
                        </table>
                      </div>
                    </td>
                    <td valign="top" style="width:50%; padding:0 0 0 8px;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#f7f8fb; padding:12px;">
                        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Program Inputs</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          ${programRows}
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>

                ${selectedOptionsHtml}

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:14px;">
                  <tr>
                    <td style="padding:0;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#f7f8fb; padding:12px;">
                        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Program Guidelines</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          ${guidelineRows}
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:14px;">
                  <tr>
                    <td style="padding:0;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#ffffff; padding:12px;">
                        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Total Estimate</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          ${totalsRows}
                        </table>
                        <div style="margin-top:10px; font-size:12px; color:#475569; text-align:right;">
                          Allowance per employee: <span style="font-weight:600; color:#0f172a;">${allowancePerEmployee}</span>
                          <span style="padding:0 6px; color:#94a3b8;">|</span>
                          Service per employee: <span style="font-weight:600; color:#0f172a;">${servicePerEmployeeFull}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:14px;">
                  <tr>
                    <td style="padding:0;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#f7f8fb; padding:12px;">
                        ${paymentTermsHtml}
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin-bottom:14px;">
                  <tr>
                    <td style="padding:0;">
                      <div style="border:1px solid #d6dce8; border-radius:12px; background:#ffffff; padding:12px;">
                        <div style="font-size:12px; font-weight:700; color:#244093; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Locations</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          <thead>
                            <tr>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">#</th>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">Label</th>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">Address</th>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">Miles (one-way)</th>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">Visits</th>
                              <th style="padding:8px 10px; text-align:left; border-bottom:1px solid #cbd5e1; font-size:12px; color:#244093; background:#eef3ff;">Travel Total</th>
                            </tr>
                          </thead>
                          <tbody>${locationRows || `<tr><td colspan="6" style="padding:10px; color:#64748b;">No locations provided.</td></tr>`}</tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  ${notesHtml}
                  ${pdfCta ? `<tr><td style="padding:12px 0 6px; text-align:right;">${pdfCta}</td></tr>` : ""}
                  <tr>
                    <td style="padding:0;">
                      <div style="font-size:11px; color:#475569;">
                        Generated by OSSO Internal Quote Tool.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function tableRow(label: string, value: string, emphasize = false) {
  const emphasizeStyle = emphasize
    ? "background:#fff7e5; font-weight:700; color:#00092f; border-bottom:1px solid #f3d9a6;"
    : "";
  return `
    <tr>
      <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#475569; ${emphasizeStyle}">${escapeHtml(label)}</td>
      <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; color:#00092f; font-weight:${emphasize ? "700" : "600"}; text-align:right; ${emphasizeStyle}">${escapeHtml(
        value
      )}</td>
    </tr>`;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:4px 0; color:#475569; font-size:12px; width:52%;">${escapeHtml(label)}</td>
      <td style="padding:4px 0; color:#00092f; font-size:13px; font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;
}

function numberOrNA(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return String(num);
}

function formatDateLabel(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "Not provided";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function formatDecimal(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(num);
}

function formatMoney(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatPaymentDiscount(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "2_15_net30" || raw === "2/15/net30" || raw === "2 15 net30") return "2/15 NET30";
  if (raw === "3_10_net30" || raw === "3/10/net30" || raw === "3 10 net30") return "3/10 NET30";
  if (raw === "none" || raw === "") return "None";
  return safeText(value);
}

function sideShieldLabel(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "Not provided";
  if (raw === "removable") return "Removable";
  if (raw.includes("integrated") || raw.includes("permanent")) return "Permanent/Integrated";
  return safeText(value);
}

function eligibilityFrequencyLabel(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "Not provided";
  if (raw === "annual") return "Annual";
  if (raw === "biennial" || raw === "every 2 years") return "Every 2 Years";
  return safeText(value);
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value: unknown) {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const trimmed = text.trim();
  return trimmed || "Not provided";
}

function isNonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function uniqueEmails(values: string[]) {
  const seen = new Set<string>();
  values.forEach((v) => {
    const trimmed = v.trim();
    if (trimmed && isEmail(trimmed)) seen.add(trimmed.toLowerCase());
  });
  return Array.from(seen);
}

function sendJson(res: ResponseLike, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(req: RequestLike, res: ResponseLike) {
  const originHeader = req?.headers?.origin;
  const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const configuredOrigin = getServerEnv("CORS_ALLOW_ORIGIN");
  const allowOrigin = configuredOrigin || requestOrigin || "*";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function validatePayload(payload: QuotePayload) {
  const calculator = payload.draft?.calculator;
  if (!calculator) return "Missing calculator data.";

  const contact = calculator.contact ?? {};
  const missing: string[] = [];
  if (!isNonEmpty(contact.fullName)) missing.push("Full Name");
  if (!isNonEmpty(contact.companyName)) missing.push("Company Name");
  if (!isNonEmpty(contact.email)) missing.push("Email");
  if (!isNonEmpty(contact.phone)) missing.push("Phone");

  if (missing.length > 0) {
    return `Complete all contact fields before submitting: ${missing.join(", ")}.`;
  }

  const locations = Array.isArray(calculator.locations) ? calculator.locations : [];
  const hasCompleteLocation = locations.some((loc) => isLocationComplete(loc));

  if (!hasCompleteLocation) {
    return "Add at least one location with street, city, and state before submitting.";
  }

  return null;
}

function isLocationComplete(loc: LocationData | null | undefined) {
  if (!loc) return false;
  return isNonEmpty(loc.streetAddress) && isNonEmpty(loc.city) && isNonEmpty(loc.state);
}

function readJsonBody(req: RequestLike): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof req.on !== "function") {
      resolve({});
      return;
    }
    let data = "";
    req.on("data", (chunk?: unknown) => {
      if (typeof chunk === "string") {
        data += chunk;
      } else if (Buffer.isBuffer(chunk)) {
        data += chunk.toString("utf8");
      } else if (chunk != null) {
        data += String(chunk);
      }
    });
    req.on("end", () => {
      try {
        const normalized = stripUtf8Bom(data);
        resolve(normalized ? JSON.parse(normalized) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function readRequestJson(req: RequestLike): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  let directBody: unknown;

  try {
    directBody = req.body;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (directBody != null) {
    if (typeof directBody === "string") {
      try {
        return { ok: true, body: JSON.parse(stripUtf8Bom(directBody)) };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
    if (Buffer.isBuffer(directBody)) {
      try {
        return { ok: true, body: JSON.parse(stripUtf8Bom(directBody.toString("utf8"))) };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
    return { ok: true, body: directBody };
  }

  try {
    const fallbackBody = await readJsonBody(req);
    return { ok: true, body: fallbackBody };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getServerEnv(name: string) {
  const direct = process.env[name];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "";
}

function sendMissingEnvError(res: ResponseLike, missingVar: "RESEND_API_KEY" | "FROM_EMAIL") {
  return sendJson(res, 500, {
    error: `Missing ${missingVar}`,
    detail: {
      cwd: process.cwd(),
      hint: "Set server env vars for the function runtime (vercel dev) and restart the process.",
    },
  });
}

function stripUtf8Bom(value: string) {
  if (!value) return value;
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseResendMessageId(responseText: string) {
  try {
    const parsed = responseText ? JSON.parse(responseText) : null;
    return typeof parsed?.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function getRequestId(req: RequestLike) {
  const raw = req?.headers?.["x-vercel-id"] ?? req?.headers?.["x-request-id"] ?? null;
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : null;
  if (typeof raw === "string") return raw;
  return null;
}

