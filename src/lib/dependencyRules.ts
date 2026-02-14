import type { BuilderGuidelines, EUPackageAddOnKey } from "./programDraft";

export type OptionGroup = "euAddOn";

type RulesContext = Pick<BuilderGuidelines, "restrictions">;

type Key = `${OptionGroup}:${string}`;

const RULES: Partial<Record<Key, (ctx: RulesContext) => boolean>> = {
  // Sunglass related add ons
  "euAddOn:polarized": (ctx) => !ctx.restrictions.restrictSunglassOptions,
  "euAddOn:tint": (ctx) => !ctx.restrictions.restrictSunglassOptions,

  // UV reactive photochromic
  "euAddOn:transitions": (ctx) => !ctx.restrictions.restrictUvReactivePhotochromicLenses,
  "euAddOn:transitionsPolarized": (ctx) => !ctx.restrictions.restrictUvReactivePhotochromicLenses,
};

export function isOptionVisible(ctx: RulesContext, group: OptionGroup, key: EUPackageAddOnKey) {
  const fn = RULES[`${group}:${key}`];
  if (!fn) return true;
  return fn(ctx);
}

export function isOptionRestricted(ctx: RulesContext, group: OptionGroup, key: EUPackageAddOnKey) {
  return !isOptionVisible(ctx, group, key);
}
