import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("page hero keeps mobile-first responsive spacing", () => {
  const source = read("src/components/layout/PageHero.tsx");
  assert.match(source, /px-4 py-8 sm:px-6 sm:py-10 lg:px-8/);
  assert.match(source, /max-w-3xl/);
});

test("program details keeps responsive layout and actions", () => {
  const source = read("src/features/program-details/ProgramDetailsPage.tsx");
  assert.match(source, /lg:grid-cols-12/);
  assert.match(source, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(source, /Potential travel surcharge/);
});

test("recommendation summary keeps responsive columns and location flag copy", () => {
  const source = read("src/features/recommendation-summary/RecommendationSummaryPage.tsx");
  assert.match(source, /Program Recommendation Summary/);
  assert.match(source, /lg:grid-cols-12/);
  assert.match(source, /Potential travel surcharge/);
});

