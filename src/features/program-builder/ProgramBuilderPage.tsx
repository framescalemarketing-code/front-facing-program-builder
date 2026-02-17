// components/P02b_ProgramBuilder.tsx
"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { destructiveButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { formatPhoneAsUs, isValidEmailFormat, isValidPhoneFormat, validateContact } from "@/lib/contactValidation";
import { createDefaultDraft } from "@/lib/programDraft";
import type {
  BuilderGuidelines,
  SideShieldType,
  EligibilityFrequency,
  CoverageType,
  AllowanceScope,
} from "@/lib/programDraft";

export function ProgramBuilderPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft, setBuilder, setProgram } = useProgramDraft();

  const sectionTitleClass = "text-2xl font-semibold tracking-tight text-foreground";
  const sectionSubtextClass = "text-sm text-muted-foreground leading-relaxed max-w-3xl";

  const inputClass =
    "w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

  const guidelines = draft.builder.guidelines;
  const coverageType = (guidelines.coverageType ?? "prescription_only") as CoverageType;
  const allowanceScope = (guidelines.allowanceScope ?? "companywide") as AllowanceScope;
  const contact = draft.program.contact;
  const contactValidation = validateContact(contact);

  const contactComplete = contactValidation.isValid;
  const contactBlockMessage =
    contactValidation.missing.length > 0
      ? `Complete all contact details to continue: ${contactValidation.missing.join(", ")}.`
      : contactValidation.invalid.length > 0
        ? `Fix invalid contact fields to continue: ${contactValidation.invalid.join(", ")}.`
        : "";
  const emailHasText = Boolean(contact.email?.trim());
  const phoneHasText = Boolean(contact.phone?.trim());
  const emailInvalid = emailHasText && !isValidEmailFormat(contact.email);
  const phoneInvalid = phoneHasText && !isValidPhoneFormat(contact.phone);

  function setGuidelinesPatch(patch: Partial<BuilderGuidelines>) {
    setBuilder((prev) => ({ ...prev, guidelines: { ...prev.guidelines, ...patch } }));
  }

  function setContactPatch(patch: Partial<typeof draft.program.contact>) {
    setProgram((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
  }

  function clearBuilderPage() {
    const defaults = createDefaultDraft();
    setBuilder(() => defaults.builder);
    setProgram((prev) => ({ ...prev, contact: defaults.program.contact }));
  }

  return (
    <section aria-labelledby="builder-title">
      <PageHero
        id="builder-title"
        title="Program Guidelines"
        subtitle="Set up your program guidelines first, then continue to Program Builder."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate("recommendation", "internal")}
              className={secondaryButtonClass}
            >
              Program Recommendation
            </button>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => onNavigate("program", "builder_continue")}
                disabled={!contactComplete}
                className={primaryButtonClass}
              >
                Continue to Program Details
              </button>
              {!contactComplete ? (
                <div className="text-xs font-medium text-destructive">{contactBlockMessage}</div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="space-y-10">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h2 className={sectionTitleClass}>Contact Details</h2>
                    <p className={sectionSubtextClass}>Enter who this program is for. These details carry through to the program preview.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Full Name</div>
                      <input
                        value={contact.fullName}
                        onChange={(e) => setContactPatch({ fullName: e.target.value })}
                        className={inputClass}
                        placeholder="Full name"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Company Name</div>
                      <input
                        value={contact.companyName}
                        onChange={(e) => setContactPatch({ companyName: e.target.value })}
                        className={inputClass}
                        placeholder="Company name"
                      />
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Email</div>
                      <input
                        type="email"
                        autoComplete="email"
                        value={contact.email}
                        onChange={(e) => setContactPatch({ email: e.target.value })}
                        className={inputClass}
                        placeholder="name@company.com"
                      />
                      {emailInvalid ? (
                        <div className="text-xs font-medium text-destructive">Enter a valid email format (name@company.com).</div>
                      ) : null}
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Phone</div>
                      <input
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        pattern="^\d{3}-\d{3}-\d{4}$"
                        maxLength={12}
                        value={contact.phone}
                        onChange={(e) => setContactPatch({ phone: formatPhoneAsUs(e.target.value) })}
                        className={inputClass}
                        placeholder="123-456-7890"
                      />
                      {phoneInvalid ? (
                        <div className="text-xs font-medium text-destructive">Enter a valid phone format: 123-456-7890.</div>
                      ) : null}
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <h2 className={sectionTitleClass}>Program Guidelines</h2>
                    <p className={sectionSubtextClass}>
                      Set your core program rules here. These controls define eligibility and policy behavior before specialist review.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Side Shield Type</div>
                      <select
                        value={guidelines.sideShieldType}
                        onChange={(e) => setGuidelinesPatch({ sideShieldType: e.target.value as SideShieldType })}
                        className={inputClass}
                      >
                        <option value="permanent">Permanent / Integrated</option>
                        <option value="removable">Removable</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Eligibility Frequency</div>
                      <select
                        value={guidelines.eligibilityFrequency}
                        onChange={(e) => setGuidelinesPatch({ eligibilityFrequency: e.target.value as EligibilityFrequency })}
                        className={inputClass}
                      >
                        <option value="annual">Annual</option>
                        <option value="biennial">Every 2 Years</option>
                      </select>
                    </label>

                    <div className="sm:col-span-2 space-y-3">
                      <div className="text-sm font-semibold text-foreground">Coverage and Allowance Rules</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <div className="text-sm font-medium text-foreground">Coverage Type</div>
                          <select
                            value={coverageType}
                            onChange={(e) => setGuidelinesPatch({ coverageType: e.target.value as CoverageType })}
                            className={inputClass}
                          >
                            <option value="prescription_only">Prescription Only</option>
                            <option value="prescription_and_plano">Prescription + Plano</option>
                            <option value="plano_only">Plano Only</option>
                          </select>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            Defines whether employees must have a prescription, may receive non prescription safety eyewear, or are limited to Plano only.
                          </div>
                        </label>

                        <label className="space-y-2">
                          <div className="text-sm font-medium text-foreground">Allowance Scope</div>
                          <select
                            value={allowanceScope}
                            onChange={(e) => setGuidelinesPatch({ allowanceScope: e.target.value as AllowanceScope })}
                            className={inputClass}
                          >
                            <option value="companywide">Single Allowance For All Employees</option>
                            <option value="department_based">Department Based Allowances</option>
                          </select>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            If department based allowances are enabled, allowance rules can vary by employee group and must be defined separately.
                          </div>
                        </label>
                      </div>

                      {allowanceScope === "department_based" ? (
                        <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground leading-relaxed">
                          Department allowances are configured separately. Confirm department definitions and policy rules with an OSSO Program Specialist before finalizing.
                        </div>
                      ) : null}
                    </div>

                    <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={guidelines.approvalWorkflowEnabled}
                        onChange={(e) => setGuidelinesPatch({ approvalWorkflowEnabled: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">Approvals</div>
                        <div className="text-xs text-muted-foreground">Additional registrations workflow for internal administrative approvals.</div>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="text-sm font-semibold text-foreground">Restrictions</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                        <input
                          type="checkbox"
                          checked={guidelines.restrictions.restrictSunglassOptions}
                          onChange={(e) =>
                            setGuidelinesPatch({
                              restrictions: {
                                ...guidelines.restrictions,
                                restrictSunglassOptions: e.target.checked,
                              },
                            })
                          }
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">Restrict Sunglass Options</div>
                          <div className="text-xs text-muted-foreground">
                            Does not include medically necessary or prescribed lens tints.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                        <input
                          type="checkbox"
                          checked={guidelines.restrictions.restrictUvReactivePhotochromicLenses}
                          onChange={(e) =>
                            setGuidelinesPatch({
                              restrictions: {
                                ...guidelines.restrictions,
                                restrictUvReactivePhotochromicLenses: e.target.checked,
                              },
                            })
                          }
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">Restrict UV Reactive Photochromic Lenses</div>
                          <div className="text-xs text-muted-foreground">
                            Does not include medically necessary or prescribed lenses.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Notes</div>
                    <textarea
                      value={guidelines.notes}
                      onChange={(e) => setGuidelinesPatch({ notes: e.target.value })}
                      rows={5}
                      className={inputClass}
                      placeholder="Add any site details, special handling, exceptions, or internal notes."
                    />
                  </label>

                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-6 rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-foreground">Program Breakdown</div>
                    <div className="text-xs text-muted-foreground">This is a lightweight preview for front-facing review.</div>
                  </div>
                </div>

                <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="rounded-md bg-secondary/30 p-4">
                    <div className="text-sm font-semibold text-foreground">Contact</div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        Full Name: <span className="text-foreground font-medium">{contact.fullName?.trim() ? contact.fullName : "Not Provided"}</span>
                      </div>
                      <div>
                        Company Name: <span className="text-foreground font-medium">{contact.companyName?.trim() ? contact.companyName : "Not Provided"}</span>
                      </div>
                      <div>
                        Email: <span className="text-foreground font-medium">{contact.email?.trim() ? contact.email : "Not Provided"}</span>
                      </div>
                      <div>
                        Phone: <span className="text-foreground font-medium">{contact.phone?.trim() ? contact.phone : "Not Provided"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-secondary/30 p-4">
                    <div className="text-sm font-semibold text-foreground">Guidelines Summary</div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        Side Shield Type:{" "}
                        <span className="text-foreground font-medium">
                          {guidelines.sideShieldType === "removable" ? "Removable" : "Permanent / Integrated"}
                        </span>
                      </div>
                      <div>
                        Eligibility Frequency:{" "}
                        <span className="text-foreground font-medium">
                          {guidelines.eligibilityFrequency === "annual" ? "Annual" : guidelines.eligibilityFrequency === "biennial" ? "Every 2 Years" : guidelines.eligibilityFrequency}
                        </span>
                      </div>
                      <div>
                        Coverage Type:{" "}
                        <span className="text-foreground font-medium">
                          {coverageType === "prescription_only"
                            ? "Prescription Only"
                            : coverageType === "prescription_and_plano"
                              ? "Prescription + Plano"
                              : "Plano Only"}
                        </span>
                      </div>
                      <div>
                        Allowance Scope:{" "}
                        <span className="text-foreground font-medium">
                          {allowanceScope === "department_based" ? "Department Based Allowances" : "Single Allowance For All Employees"}
                        </span>
                      </div>
                      <div>
                        Approvals: <span className="text-foreground font-medium">{guidelines.approvalWorkflowEnabled ? "Enabled" : "Not Enabled"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-secondary/30 p-4">
                    <div className="text-sm font-semibold text-foreground">Restrictions</div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      <div>
                        Restrict Sunglass Options: <span className="text-foreground font-medium">{guidelines.restrictions.restrictSunglassOptions ? "Yes" : "No"}</span>
                      </div>
                      <div>
                        Restrict UV Reactive Photochromic Lenses: <span className="text-foreground font-medium">{guidelines.restrictions.restrictUvReactivePhotochromicLenses ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </div>

                  {guidelines.notes?.trim() ? (
                    <div className="rounded-md bg-secondary/30 p-4">
                      <div className="text-sm font-semibold text-foreground">Notes</div>
                      <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{guidelines.notes}</div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-border bg-card px-4 py-4 sm:px-6">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                      <button type="button" onClick={clearBuilderPage} className={`${destructiveButtonClass} w-full sm:w-auto`}>
                        Clear Program
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate("program", "builder_continue")}
                        disabled={!contactComplete}
                        className={`${primaryButtonClass} w-full sm:w-auto`}
                      >
                        Continue to Program Details
                      </button>
                    </div>
                    {!contactComplete ? (
                      <div className="text-xs font-medium text-destructive sm:text-right">{contactBlockMessage}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
