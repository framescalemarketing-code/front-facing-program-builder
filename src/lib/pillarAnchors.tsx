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
    phrase: "People-First Service",
    icon: "👤",
  },
  adoption: {
    phrase: "Built for Adoption",
    icon: "🎯",
  },
  reliability: {
    phrase: "Reliable by Design",
    icon: "⚙️",
  },
  follow_through: {
    phrase: "Care that continues",
    icon: "🤝",
  },
};
