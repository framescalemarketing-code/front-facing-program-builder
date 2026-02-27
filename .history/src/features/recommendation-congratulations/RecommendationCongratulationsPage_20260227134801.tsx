"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { defaultDraft } from "@/lib/programDraft";

function nonEmpty(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function StepBadge({
  number,
  label,
  description,
}: {
  number: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function RecommendationCongratulationsPage({
  onNavigate,
}: {
  onNavigate: NavigateFn;
}) {
  const { draft } = useProgramDraft();
  const companyName = nonEmpty(draft?.program.contact.companyName);
  const contactEmail =
    nonEmpty(draft?.program.contact.email) ??
    nonEmpty(defaultDraft.program.contact.email);
  const contactName = nonEmpty(draft?.program.contact.fullName);

  const subject = "OSSO Program Recommendation. Follow Up";
  const body = [
    "Hello OSSO team,",
    "",
    "I completed the OSSO program recommendation and would like to connect on next steps.",
    companyName ? `Company: ${companyName}` : null,
    contactEmail ? `Contact email: ${contactEmail}` : null,
    "",
    "Please reach out once you've reviewed my profile.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section aria-labelledby="recommendation-congratulations-title">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#2971b5] via-[#4a8fd4] to-[#6baee8] text-white">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="confetti-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="white" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#confetti-grid)" />
        </svg>

        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.5]"
                  aria-hidden="true"
                >
                  <path d="M3 8.5L6.5 12L13 5" />
                </svg>
                Recommendation Submitted
              </div>
              <h1
                id="recommendation-congratulations-title"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                {contactName
                  ? `You're all set, ${contactName.split(" ")[0]}.`
                  : "Your recommendation is ready."}
              </h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/90">
                An OSSO program specialist will review your profile and reach
                out to confirm next steps. Nothing moves until you review it
                together.
              </p>
            </div>

            <div
              className="hidden overflow-hidden rounded-2xl lg:block"
              aria-hidden="true"
            >
              <img
                src="/images/congrats-specialist-handoff.jpg"
                alt=""
                className="aspect-[4/3] w-full rounded-2xl border border-white/15 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <article className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border bg-secondary/30 px-5 py-4">
                  <h2 className="text-base font-bold text-foreground">
                    What happens next
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Three steps, no surprises
                  </p>
                </div>
                <div className="space-y-6 p-5">
                  <StepBadge
                    number="1"
                    label="Specialist review, usually within one business day"
                    description="An OSSO program specialist reads your recommendation and profile before making contact. They come to the first call familiar with your setup."
                  />

                  <div
                    className="overflow-hidden rounded-lg"
                    aria-hidden="true"
                  >
                    <img
                      src="/images/congrats-specialist-review.jpg"
                      alt=""
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <StepBadge
                    number="2"
                    label="A conversation, not a pitch"
                    description="You will walk through the recommendation together, adjust what does not fit, and confirm structure before anything is locked."
                  />
                  <StepBadge
                    number="3"
                    label="Rollout plan built around your timeline"
                    description="Once aligned, your rollout plan is built around your site, your schedule, and how your team actually operates."
                  />
                </div>
              </article>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={mailtoHref}
                  className={`${primaryButtonClass} flex-1 text-center`}
                >
                  Connect with an OSSO Specialist
                </a>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate("recommendation_summary", "internal")
                  }
                  className={`${secondaryButtonClass} flex-1`}
                >
                  Review Your Summary
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {(companyName || contactEmail) && (
                <article className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submitted for
                  </h3>
                  {companyName && (
                    <p className="text-base font-bold text-foreground">
                      {companyName}
                    </p>
                  )}
                  {contactEmail && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {contactEmail}
                    </p>
                  )}
                </article>
              )}

              <div className="overflow-hidden rounded-xl" aria-hidden="true">
                <img
                  src="/images/congrats-team.jpg"
                  alt=""
                  className="aspect-[3/2] w-full rounded-xl border border-border object-cover"
                  loading="lazy"
                />
              </div>

              <article className="rounded-xl border border-border bg-secondary/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <svg
                      viewBox="0 0 20 20"
                      className="h-5 w-5 text-foreground"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm-2 6V5a2 2 0 1 1 4 0v2H8Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-foreground">
                      Your data is safe
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Your recommendation is only shared with your assigned OSSO
                      specialist. Nothing is sold, shared with third parties, or
                      used outside your program setup.
                    </p>
                  </div>
                </div>
              </article>

              <button
                type="button"
                onClick={() => onNavigate("recommendation", "internal")}
                className={`${secondaryButtonClass} w-full text-center`}
              >
                Start a new recommendation
              </button>
            </div>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
