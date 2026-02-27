export type PillarIconKey =
  | "human_first"
  | "adoption"
  | "reliability"
  | "follow_through";

export const PILLAR_DEFINITIONS: Record<
  PillarIconKey,
  { phrase: string; icon: string }
> = {
  human_first: {
    phrase: "Human First Safety",
    icon: "🛡️",
  },
  adoption: {
    phrase: "Adoption over Allowance",
    icon: "👓",
  },
  reliability: {
    phrase: "Reliability by Design",
    icon: "⚙️",
  },
  follow_through: {
    phrase: "Follow Through as a Feature",
    icon: "✅",
  },
};
