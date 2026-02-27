import type { ReactElement } from "react";

export type PillarIconKey = "human_first" | "adoption" | "reliability" | "follow_through";

export const PILLAR_DEFINITIONS: Record<PillarIconKey, { phrase: string; icon: ReactElement }> = {
  human_first: {
    phrase: "Human First Safety",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]">
        <path d="M8 13L3.5 8.55C2.35 7.4 2.35 5.55 3.5 4.4C4.65 3.25 6.5 3.25 7.65 4.4L8 4.75L8.35 4.4C9.5 3.25 11.35 3.25 12.5 4.4C13.65 5.55 13.65 7.4 12.5 8.55L8 13Z" />
      </svg>
    ),
  },
  adoption: {
    phrase: "Adoption over Allowance",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]">
        <circle cx="8" cy="8" r="4.5" />
        <circle cx="8" cy="8" r="2.2" />
        <path d="M8 1.5V3.2M8 12.8V14.5M1.5 8H3.2M12.8 8H14.5" />
      </svg>
    ),
  },
  reliability: {
    phrase: "Reliability by Design",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]">
        <path d="M8 2.2L12.5 4V7.8C12.5 10.7 10.9 12.9 8 13.8C5.1 12.9 3.5 10.7 3.5 7.8V4L8 2.2Z" />
      </svg>
    ),
  },
  follow_through: {
    phrase: "Follow Through as a Feature",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[17px] w-[17px] fill-none stroke-current stroke-[1.7]">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M5.5 8.2L7.3 10L10.7 6.6" />
      </svg>
    ),
  },
};
