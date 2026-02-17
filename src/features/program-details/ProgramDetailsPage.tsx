"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { destructiveButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { makeDefaultLocations, type EUPackage, type ServiceTier } from "@/lib/programDraft";

const EU_OPTIONS: EUPackage[] = ["Compliance", "Comfort", "Complete", "Covered"];
const TIER_OPTIONS: ServiceTier[] = ["Essential", "Access", "Premier", "Enterprise"];
const SURCHARGE_MILE_THRESHOLD = 50;

function clampNonNegativeInt(raw: string) {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  return Math.max(0, Number(cleaned));
}

function clampNonNegativeNumber(raw: string) {
  if (!raw.trim()) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function isAddressComplete(street: string, city: string, state: string) {
  return Boolean(street.trim() && city.trim() && state.trim());
}

export function ProgramDetailsPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft, setProgram } = useProgramDraft();
  const program = draft.program;
  const locations = program.locations;

  const continueDisabled = !program.selectedEU || !program.selectedTier || locations.length === 0;

  const continueBlockMessage = !program.selectedEU
    ? "Select an EU package to continue."
    : !program.selectedTier
      ? "Select a service tier to continue."
      : locations.length === 0
        ? "Add at least one location to continue."
        : "";

  function setField<K extends keyof typeof program>(key: K, value: (typeof program)[K]) {
    setProgram((prev) => ({ ...prev, [key]: value }));
  }

  function updateLocation(
    idx: number,
    patch: Partial<(typeof program.locations)[number]>
  ) {
    setProgram((prev) => ({
      ...prev,
      locations: prev.locations.map((row, rowIdx) => (rowIdx === idx ? { ...row, ...patch } : row)),
    }));
  }

  function addLocation() {
    setProgram((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          ...makeDefaultLocations()[0],
          label: `Location ${prev.locations.length + 1}`,
        },
      ],
    }));
  }

  function removeLocation(idx: number) {
    setProgram((prev) => {
      if (prev.locations.length <= 1) return prev;
      return {
        ...prev,
        locations: prev.locations
          .filter((_, rowIdx) => rowIdx !== idx)
          .map((row, rowIdx) => ({ ...row, label: `Location ${rowIdx + 1}` })),
      };
    });
  }

  function clearLocations() {
    setField("locations", makeDefaultLocations());
  }

  function clearProgramDetails() {
    setProgram((prev) => ({
      ...prev,
      selectedEU: "",
      selectedTier: "",
      eligibleEmployees: 1,
      locations: makeDefaultLocations(),
    }));
  }

  return (
    <section aria-labelledby="program-details-title">
      <PageHero
        id="program-details-title"
        title="Program Details"
        subtitle="Capture package, service tier, and locations for a front-facing planning summary."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => onNavigate("builder", "internal")} className={secondaryButtonClass}>
              Back to Guidelines
            </button>
            <button type="button" onClick={() => onNavigate("recommendation", "internal")} className={secondaryButtonClass}>
              Program Recommendation
            </button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Program Selection</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 sm:col-span-1">
                      <div className="text-sm font-medium text-foreground">EU Package</div>
                    <select
                      value={program.selectedEU}
                      onChange={(e) => setField("selectedEU", e.target.value as EUPackage)}
                      className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <option value="">Select package</option>
                      {EU_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 sm:col-span-1">
                    <div className="text-sm font-medium text-foreground">Service Tier</div>
                    <select
                      value={program.selectedTier}
                      onChange={(e) => setField("selectedTier", e.target.value as ServiceTier)}
                      className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <option value="">Select tier</option>
                      {TIER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 sm:col-span-1">
                    <div className="text-sm font-medium text-foreground">Employees (Total)</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={program.eligibleEmployees === "" ? "" : String(program.eligibleEmployees)}
                      onChange={(e) => setField("eligibleEmployees", clampNonNegativeInt(e.target.value))}
                      className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      placeholder="1"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Locations</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Enter each location and one-way miles. If miles are over 50, the summary will show Potential travel surcharge.
                </div>

                <div className="mt-4 space-y-3">
                  {locations.map((loc, idx) => (
                    <div key={idx} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">{loc.label || `Location ${idx + 1}`}</div>
                        {locations.length > 1 ? (
                          <button type="button" onClick={() => removeLocation(idx)} className={secondaryButtonClass}>
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <div className="text-sm font-medium text-foreground">Street Address</div>
                          <input
                            value={loc.streetAddress}
                            onChange={(e) => updateLocation(idx, { streetAddress: e.target.value })}
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                            placeholder="Street address"
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="space-y-2 sm:col-span-1">
                            <div className="text-sm font-medium text-foreground">City</div>
                            <input
                              value={loc.city}
                              onChange={(e) => updateLocation(idx, { city: e.target.value })}
                              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                              placeholder="City"
                            />
                          </label>
                          <label className="space-y-2 sm:col-span-1">
                            <div className="text-sm font-medium text-foreground">State</div>
                            <input
                              value={loc.state}
                              onChange={(e) => updateLocation(idx, { state: e.target.value })}
                              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                              placeholder="State"
                            />
                          </label>
                          <label className="space-y-2 sm:col-span-1">
                            <div className="text-sm font-medium text-foreground">ZIP</div>
                            <input
                              value={loc.zipCode}
                              onChange={(e) => updateLocation(idx, { zipCode: e.target.value })}
                              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                              placeholder="ZIP"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <div className="text-sm font-medium text-foreground">One-Way Miles</div>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={loc.oneWayMiles}
                            onChange={(e) =>
                              updateLocation(idx, {
                                oneWayMiles: clampNonNegativeNumber(e.target.value),
                              })
                            }
                            className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                            placeholder="0"
                          />
                        </label>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-foreground">Location Status</div>
                          <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                            {loc.oneWayMiles > SURCHARGE_MILE_THRESHOLD ? "Potential travel surcharge" : "Standard travel range"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={addLocation} className={secondaryButtonClass}>
                    Add Location
                  </button>
                  <button type="button" onClick={clearLocations} className={secondaryButtonClass}>
                    Clear Locations
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-6 lg:col-span-5">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Program Summary</div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  <div>
                    EU Package: <span className="font-medium text-foreground">{program.selectedEU || "Not Selected"}</span>
                  </div>
                  <div>
                    Service Tier: <span className="font-medium text-foreground">{program.selectedTier || "Not Selected"}</span>
                  </div>
                  <div>
                    Employees (Total):{" "}
                    <span className="font-medium text-foreground">{program.eligibleEmployees || 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-semibold text-foreground">Location Summary</div>
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {locations.map((loc, idx) => {
                    const complete = isAddressComplete(loc.streetAddress, loc.city, loc.state);
                    return (
                      <div key={idx} className="rounded-md border border-border bg-background p-3">
                        <div className="font-medium text-foreground">Location {idx + 1}</div>
                        <div className="mt-1">
                          {complete ? `${loc.streetAddress.trim()}, ${loc.city.trim()}, ${loc.state.trim()}` : "Address not complete"}
                        </div>
                        {loc.oneWayMiles > SURCHARGE_MILE_THRESHOLD ? (
                          <div className="mt-1 font-medium text-foreground">Potential travel surcharge</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={clearProgramDetails} className={destructiveButtonClass}>
                    Clear Program
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("recommendation_summary", "program_continue")}
                    disabled={continueDisabled}
                    className={`${primaryButtonClass} ${continueDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Continue to Summary
                  </button>
                </div>
                {continueBlockMessage ? (
                  <div className="mt-2 text-xs font-medium text-destructive">{continueBlockMessage}</div>
                ) : null}
              </div>
            </aside>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
