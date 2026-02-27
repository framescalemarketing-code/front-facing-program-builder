"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { defaultDraft } from "@/lib/programDraft";

function nonEmpty(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function StepBadge({ number, label, description }: { number: string; label: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function RecommendationCongratulationsPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft } = useProgramDraft();
  const companyName = nonEmpty(draft?.program.contact.companyName);
  const contactEmail = nonEmpty(draft?.program.contact.email) ?? nonEmpty(defaultDraft.program.contact.email);
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
      {/* ── Hero: two-column on large screens, text left, image right ── */}
      <header className="bg-gradient-to-br from-[#00092f] via-[#162d6e] to-[#244093] text-white relative overflow-hidden">
        {/* Subtle dot texture */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id="confetti-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#confetti-dots)" />
        </svg>

        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">

            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-4">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.5]" aria-hidden="true">
                  <path d="M3 8.5L6.5 12L13 5" />
                </svg>
                Recommendation Submitted
              </div>
              <h1
                id="recommendation-congratulations-title"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              >
                {contactName ? `You're all set, ${contactName.split(" ")[0]}.` : "Your recommendation is ready."}
              </h1>
              <p className="mt-3 max-w-md text-white/70 text-base leading-relaxed">
                An OSSO program specialist will review your profile and reach out to confirm next steps. Nothing moves until you've reviewed it together.
              </p>
            </div>

            {/* Right: image placeholder */}
            {/* Replace src with your real hero image when ready */}
            <div
              className="hidden overflow-hidden rounded-2xl lg:block"
              aria-hidden="true"
            >
              <div
                className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm"
                data-placeholder-src="/images/congrats-specialist-handoff.jpg"
              >
                <span className="px-6 text-center font-mono text-[11px] leading-relaxed text-white/30">
                  /images/congrats-specialist-handoff.jpg
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ── What Happens Next ── */}
            <div className="lg:col-span-2 space-y-5">
              <article className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-secondary/30 px-5 py-4">
                  <h2 className="text-base font-bold text-foreground">What happens next</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Three steps, no surprises</p>
                </div>
                <div className="p-5 space-y-6">
                  <StepBadge
                    number="1"
                    label="Specialist review — usually within one business day"
                    description="An OSSO program specialist reads your recommendation and profile before making contact. They come to the first call already familiar with your setup."
                  />

                  {/* Image placeholder — between steps 1 and 2 */}
                  {/* Replace with a photo of a specialist reviewing a program or on a call */}
                  <div
                    className="overflow-hidden rounded-lg"
                    aria-hidden="true"
                  >
                    <div
                      className="flex h-36 w-full items-center justify-center bg-[#f0f4fb]"
                      data-placeholder-src="/images/congrats-specialist-review.jpg"
                    >
                      <span className="font-mono text-[10px] text-[#244093]/30">
                        /images/congrats-specialist-review.jpg
                      </span>
                    </div>
                  </div>

                  <StepBadge
                    number="2"
                    label="A conversation, not a pitch"
                    description="You'll walk through the recommendation together — adjusting anything that doesn't fit and confirming the structure before anything is locked."
                  />
                  <StepBadge
                    number="3"
                    label="Rollout plan built around your timeline"
                    description="Once aligned, your rollout plan is built around your site, your schedule, and the way your team actually operates."
                  />
                </div>
              </article>

              {/* Connect CTA */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={mailtoHref} className={`${primaryButtonClass} flex-1 text-center`}>
                  Connect with an OSSO Specialist →
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate("recommendation_summary", "internal")}
                  className={`${secondaryButtonClass} flex-1`}
                >
                  ← Review Your Summary
                </button>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-5">
              {/* Company context card */}
              {(companyName || contactEmail) && (
                <article className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Submitted for</h3>
                  {companyName && (
                    <p className="text-base font-bold text-foreground">{companyName}</p>
                  )}
                  {contactEmail && (
                    <p className="text-sm text-muted-foreground mt-0.5">{contactEmail}</p>
                  )}
                </article>
              )}

              {/* Image placeholder — sidebar team photo */}
              {/* Replace with a photo of the OSSO team or a specialist */}
              <div
                className="overflow-hidden rounded-xl"
                aria-hidden="true"
              >
                <div
                  className="flex aspect-[3/2] w-full items-center justify-center bg-[#f0f4fb] rounded-xl border border-border"
                  data-placeholder-src="/images/congrats-team.jpg"
                >
                  <span className="font-mono text-[10px] text-[#244093]/30">/images/congrats-team.jpg</span>
                </div>
              </div>

              {/* Trust note */}
              <article className="rounded-xl border border-border bg-secondary/20 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden="true">🔒</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Your data is safe</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your recommendation is only shared with your assigned OSSO specialist. Nothing is sold, shared with third parties, or used outside of your program setup.
                    </p>
                  </div>
                </div>
              </article>

              {/* Start over */}
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
