"use client";

import type { NavigateFn } from "@/app/routerTypes";
import { PageHero } from "@/components/layout/PageHero";
import { SectionWrap } from "@/components/layout/SectionWrap";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/buttonStyles";
import { useProgramDraft } from "@/hooks/useProgramDraft";
import { defaultDraft } from "@/lib/programDraft";

function nonEmpty(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function RecommendationCongratulationsPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { draft } = useProgramDraft();
  const companyName = nonEmpty(draft?.program.contact.companyName);
  const contactEmail = nonEmpty(draft?.program.contact.email) ?? nonEmpty(defaultDraft.program.contact.email);

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
      <PageHero
        id="recommendation-congratulations-title"
        title="Your recommendation is ready."
        subtitle="An OSSO program specialist will review your profile and reach out to confirm next steps."
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionWrap>
          <div className="rounded-md border border-border bg-card p-5 sm:p-6">
            <img
              src="/images/placeholders/congratulations-banner.svg"
              alt="Program recommendation completion illustration"
              className="mb-4 w-full rounded-md border border-border"
              loading="lazy"
            />
            <h2 className="text-base font-semibold text-foreground">What happens next</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>An OSSO program specialist reviews your recommendation and profile — typically within one business day.</li>
              <li>You'll receive a follow-up to walk through the recommendation together and confirm structure before anything is locked.</li>
              <li>Once aligned, your rollout plan is built around your site, your schedule, and your timeline.</li>
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a href={mailtoHref} className={primaryButtonClass}>
                Connect with an OSSO Specialist
              </a>
              <button type="button" onClick={() => onNavigate("recommendation_summary", "internal")} className={secondaryButtonClass}>
                Back to Summary
              </button>
            </div>
          </div>
        </SectionWrap>
      </div>
    </section>
  );
}
