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

  const subject = "OSSO Program Recommendation Follow Up";
  const body = [
    "Hello OSSO team,",
    "",
    "I would like to follow up on my recommendation summary.",
    companyName ? `Company: ${companyName}` : null,
    contactEmail ? `Contact email: ${contactEmail}` : null,
    "",
    "Please share next steps.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section aria-labelledby="recommendation-congratulations-title">
      <PageHero
        id="recommendation-congratulations-title"
        title="Congratulations"
        subtitle="Your recommendation is ready. An OSSO program specialist will follow up."
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
              <li>A specialist reviews your recommendation and program profile.</li>
              <li>You receive a follow-up to confirm implementation details.</li>
              <li>Your rollout plan is finalized with site and timeline specifics.</li>
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a href={mailtoHref} className={primaryButtonClass}>
                Contact an OSSO Program Specialist
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
