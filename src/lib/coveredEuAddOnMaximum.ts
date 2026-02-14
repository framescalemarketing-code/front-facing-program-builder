import type { EUPackageAddOnKey } from "./programDraft";

type EuAddOnItem = {
  key: EUPackageAddOnKey;
  amount: number;
};

const INCOMPATIBLE_PAIRS: ReadonlyArray<readonly [EUPackageAddOnKey, EUPackageAddOnKey]> = [
  ["blueLightAntiReflective", "antiReflectiveStd"],
  ["blueLightAntiReflective", "extraScratchCoating"],
  ["extraScratchCoating", "antiFog"],
  ["antiReflectiveStd", "extraScratchCoating"],
  ["polarized", "tint"],
  ["polarized", "transitions"],
  ["polarized", "transitionsPolarized"],
  ["transitions", "transitionsPolarized"],
  ["transitions", "tint"],
  ["transitionsPolarized", "tint"],
];

const INCOMPATIBLE_BY_KEY = INCOMPATIBLE_PAIRS.reduce<Record<EUPackageAddOnKey, EUPackageAddOnKey[]>>(
  (acc, [left, right]) => {
    acc[left].push(right);
    acc[right].push(left);
    return acc;
  },
  {
    polarized: [],
    antiFog: [],
    antiReflectiveStd: [],
    blueLightAntiReflective: [],
    tint: [],
    transitions: [],
    transitionsPolarized: [],
    extraScratchCoating: [],
  }
);

export function incompatibleCoveredEuAddOnsFor(key: EUPackageAddOnKey) {
  return INCOMPATIBLE_BY_KEY[key];
}

function hasIncompatiblePair(selected: EUPackageAddOnKey[]) {
  const selectedSet = new Set(selected);
  for (const key of selected) {
    const incompatible = INCOMPATIBLE_BY_KEY[key];
    if (incompatible.some((candidate) => selectedSet.has(candidate))) return true;
  }
  return false;
}

export function maxCompatibleCoveredEuAddOnsAmount(items: EuAddOnItem[]) {
  const n = items.length;
  let best = 0;

  // Brute-force is tiny here (2^8 combinations with current add-on set).
  for (let mask = 0; mask < 1 << n; mask += 1) {
    const selectedKeys: EUPackageAddOnKey[] = [];
    let total = 0;

    for (let i = 0; i < n; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      selectedKeys.push(items[i].key);
      total += items[i].amount;
    }

    if (hasIncompatiblePair(selectedKeys)) continue;
    if (total > best) best = total;
  }

  return best;
}
