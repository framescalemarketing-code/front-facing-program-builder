"use client";

import { useMemo, useState } from "react";
import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { formatPhoneAsUs, isValidEmailFormat } from "@/lib/contactValidation";
import {
  DEFAULT_DISCOVERY_INPUTS,
  buildDiscoveryRecommendation,
  type DiscoveryHazard,
  type DiscoveryInputs,
} from "@/lib/discoveryRecommendation";

const HAZARD_OPTIONS: Array<{ value: DiscoveryHazard; label: string; helper: string }> = [
  { value: "impact", label: "High Impact Exposure", helper: "High movement, tools, or heavy machinery zones." },
  { value: "dust_debris", label: "Dust or Debris", helper: "Grinding, cutting, sanding, or particulate-heavy areas." },
  { value: "chemical_splash", label: "Chemical Splash", helper: "Lab, treatment, mixing, or hazardous fluid exposure." },
  { value: "outdoor_glare", label: "Outdoor Glare", helper: "Regular bright daylight or reflective outdoor work." },
  { value: "fog_humidity", label: "Fog or Humidity", helper: "Temperature swings or humid settings causing lens fog." },
  { value: "indoor_outdoor_shift", label: "Indoor/Outdoor Shifts", helper: "Employees frequently move between lighting conditions." },
  { value: "screen_intensive", label: "Screen-Intensive Tasks", helper: "Frequent computer or digital device usage." },
];

const ADD_ON_LABELS: Record<string, string> = {
  antiFog: "Anti-Fog",
  antiReflectiveStd: "Anti-Reflective",
  blueLightAntiReflective: "Blue Light + Anti-Reflective",
  extraScratchCoating: "Extra Scratch Coating",
  polarized: "Polarized",
  tint: "Tint",
  transitions: "Transitions",
  transitionsPolarized: "Transitions Polarized",
};

function clampPositiveInt(raw: string, fallback: number) {
  const next = Number.parseInt(raw, 10);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(1, next);
}

export function ProgramDiscoveryPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const [form, setForm] = useState<DiscoveryInputs>(() => ({ ...DEFAULT_DISCOVERY_INPUTS }));
  const { updateDraft } = useProgramDraft();

  const sectionTitleClass = "text-2xl font-semibold tracking-tight text-foreground";
  const sectionSubtextClass = "text-sm text-muted-foreground leading-relaxed max-w-3xl";
  const inputClass =
    "w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

  const recommendation = useMemo(() => buildDiscoveryRecommendation(form), [form]);
  const addOnsLabel = useMemo(() => {
    const euAddOns = recommendation.patch.calculator?.addOns?.euPackageAddOns ?? {};
    const selected = Object.entries(euAddOns)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => ADD_ON_LABELS[key] ?? key);
    return selected.length > 0 ? selected.join(", ") : "None";
  }, [recommendation.patch.calculator?.addOns?.euPackageAddOns]);

  const emailHasValue = Boolean(form.contactEmail.trim());
  const emailInvalid = emailHasValue && !isValidEmailFormat(form.contactEmail);

  function setField<K extends keyof DiscoveryInputs>(key: K, value: DiscoveryInputs[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleHazard(hazard: DiscoveryHazard) {
    setForm((prev) => {
      const exists = prev.hazards.includes(hazard);
      return {
        ...prev,
        hazards: exists ? prev.hazards.filter((entry) => entry !== hazard) : [...prev.hazards, hazard],
      };
    });
  }

  function resetForm() {
    setForm({ ...DEFAULT_DISCOVERY_INPUTS });
  }

  function prefillAndOpenQuote() {
    updateDraft(recommendation.patch);
    onNavigate("quote", "internal");
  }

  return (
    <section aria-labelledby="discovery-title">
      <PageHero
        id="discovery-title"
        title="Program Discovery"
        subtitle="Capture discovery inputs and preview a starter program setup before opening Quote Preview."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => onNavigate("builder", "internal")} className={secondaryButtonClass}>
              Back to Program Builder
            </button>
          </div>

          <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Use this page to auto-select a program and prefill the Quote Preview page. This does not email or submit a quote.
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-7">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className={sectionTitleClass}>Contact and Company Details</h2>
                  <p className={sectionSubtextClass}>
                    Start with core discovery details for the company and point of contact.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Contact Name</div>
                    <input
                      value={form.contactName}
                      onChange={(e) => setField("contactName", e.target.value)}
                      className={inputClass}
                      placeholder="Full name"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Contact Email</div>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setField("contactEmail", e.target.value)}
                      className={inputClass}
                      placeholder="name@company.com"
                    />
                    {emailInvalid ? (
                      <div className="text-xs font-medium text-destructive">Enter a valid email format (name@company.com).</div>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Contact Phone</div>
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => setField("contactPhone", formatPhoneAsUs(e.target.value))}
                      className={inputClass}
                      placeholder="123-456-7890"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Company Name</div>
                    <input
                      value={form.companyName}
                      onChange={(e) => setField("companyName", e.target.value)}
                      className={inputClass}
                      placeholder="Company name"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Industry</div>
                    <select
                      value={form.industry}
                      onChange={(e) => setField("industry", e.target.value as DiscoveryInputs["industry"])}
                      className={inputClass}
                    >
                      <option value="manufacturing">Manufacturing</option>
                      <option value="construction">Construction</option>
                      <option value="utilities">Utilities</option>
                      <option value="logistics">Logistics and Warehousing</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="public_sector">Public Sector</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Employee Estimate</div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.employeeEstimate}
                      onChange={(e) => setField("employeeEstimate", clampPositiveInt(e.target.value, form.employeeEstimate))}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Estimated Service Locations</div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.locationCount}
                      onChange={(e) => setField("locationCount", clampPositiveInt(e.target.value, form.locationCount))}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className={sectionTitleClass}>Discovery Details</h2>
                  <p className={sectionSubtextClass}>
                    Capture hazard exposure, eyewear usage patterns, and current program model.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {HAZARD_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                      <input
                        type="checkbox"
                        checked={form.hazards.includes(option.value)}
                        onChange={() => toggleHazard(option.value)}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.helper}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Prescription Mix</div>
                    <select
                      value={form.prescriptionMix}
                      onChange={(e) =>
                        setField("prescriptionMix", e.target.value as DiscoveryInputs["prescriptionMix"])
                      }
                      className={inputClass}
                    >
                      <option value="mostly_prescription">Mostly Prescription</option>
                      <option value="mixed_prescription_and_non_prescription">Mixed Prescription and Non-Prescription</option>
                      <option value="bulk_over_the_glasses">Bulk Over the Glasses</option>
                      <option value="non_prescription_safety_eyewear">Non-Prescription Safety Eyewear</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Current Program Model</div>
                    <select
                      value={form.currentProgramModel}
                      onChange={(e) =>
                        setField("currentProgramModel", e.target.value as DiscoveryInputs["currentProgramModel"])
                      }
                      className={inputClass}
                    >
                      <option value="voucher">Voucher</option>
                      <option value="insurance">Insurance</option>
                      <option value="third_party_vendor">Third-Party Vendor</option>
                      <option value="none">No Current Program</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Eligibility Frequency</div>
                    <select
                      value={form.renewalFrequency}
                      onChange={(e) =>
                        setField("renewalFrequency", e.target.value as DiscoveryInputs["renewalFrequency"])
                      }
                      className={inputClass}
                    >
                      <option value="annual">Annual</option>
                      <option value="biennial">Every 2 Years</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                    <input
                      type="checkbox"
                      checked={form.hasDistinctDepartments}
                      onChange={(e) => setField("hasDistinctDepartments", e.target.checked)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Distinct Department Needs</div>
                      <div className="text-xs text-muted-foreground">
                        Different employee groups need different eyewear setups.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                    <input
                      type="checkbox"
                      checked={form.requiresManagerApproval}
                      onChange={(e) => setField("requiresManagerApproval", e.target.checked)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Manager Approval Required</div>
                      <div className="text-xs text-muted-foreground">
                        Program enrollments require an approval workflow.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className={sectionTitleClass}>Budget and Program Goals</h2>
                  <p className={sectionSubtextClass}>
                    Set budget comfort and program priority in a friendly way so selections fit your current reality.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Program Priority</div>
                    <select
                      value={form.priority}
                      onChange={(e) => setField("priority", e.target.value as DiscoveryInputs["priority"])}
                      className={inputClass}
                    >
                      <option value="cost_control">Cost Control</option>
                      <option value="balanced">Balanced</option>
                      <option value="coverage_quality">Coverage Quality</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Budget Comfort Level</div>
                    <select
                      value={form.budgetLevel}
                      onChange={(e) => setField("budgetLevel", e.target.value as DiscoveryInputs["budgetLevel"])}
                      className={inputClass}
                    >
                      <option value="tight_budget">Need to Keep Costs Tight</option>
                      <option value="moderate_budget">Working With a Moderate Budget</option>
                      <option value="high_budget">Able to Invest for Best Coverage</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className={sectionTitleClass}>Location Details</h2>
                  <p className={sectionSubtextClass}>
                    Capture the primary location details used for the first pass in Quote Preview.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <div className="text-sm font-medium text-foreground">Street Address</div>
                    <input
                      value={form.primaryStreet}
                      onChange={(e) => setField("primaryStreet", e.target.value)}
                      className={inputClass}
                      placeholder="Street address"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">City</div>
                    <input
                      value={form.primaryCity}
                      onChange={(e) => setField("primaryCity", e.target.value)}
                      className={inputClass}
                      placeholder="City"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">State</div>
                    <input
                      value={form.primaryState}
                      onChange={(e) => setField("primaryState", e.target.value)}
                      className={inputClass}
                      placeholder="State"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground">ZIP</div>
                    <input
                      value={form.primaryZip}
                      onChange={(e) => setField("primaryZip", e.target.value)}
                      className={inputClass}
                      placeholder="ZIP"
                    />
                  </label>
                </div>
              </div>

              <label className="space-y-2">
                <div className="text-sm font-medium text-foreground">Additional Discovery Notes</div>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => setField("additionalNotes", e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Compliance requirements, special policies, vendor constraints, rollout timing, and special handling."
                />
              </label>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" onClick={resetForm} className={secondaryButtonClass}>
                  Reset Discovery Inputs
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-lg border border-border bg-card p-5 lg:sticky lg:top-6">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-foreground">Program Selection Preview</div>
                  <div className="text-xs text-muted-foreground">
                    Live program selection based on current discovery inputs.
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-md bg-secondary/30 p-4 text-sm text-muted-foreground">
                  <div>
                    EU Package: <span className="font-semibold text-foreground">{recommendation.recommendedEU}</span>
                  </div>
                  <div>
                    Service Tier: <span className="font-semibold text-foreground">{recommendation.recommendedTier}</span>
                  </div>
                  <div>
                    Add-Ons: <span className="font-semibold text-foreground">{addOnsLabel}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-sm font-semibold text-foreground">Discovery Summary</div>
                  <textarea
                    readOnly
                    value={recommendation.summaryNote}
                    rows={14}
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div className="mt-5 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                  Clicking below applies the current selection to the draft and opens Quote Preview. It does not send the quote.
                </div>

                <button
                  type="button"
                  className={`${primaryButtonClass} mt-4 w-full`}
                  onClick={prefillAndOpenQuote}
                >
                  Apply Selection and Open Quote Preview
                </button>
              </div>
            </div>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
