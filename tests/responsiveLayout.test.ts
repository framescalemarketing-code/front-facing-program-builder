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

test("calculator sticky footer keeps responsive button grid", () => {
  const source = read("src/features/program-calculator/ProgramCalculatorPage.tsx");
  assert.match(source, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
  assert.match(source, /text-3xl font-semibold tracking-tight text-foreground sm:text-4xl/);
});

test("quote preview preserves print styles and responsive top actions", () => {
  const source = read("src/features/quote-preview/QuotePreviewPage.tsx");
  assert.match(source, /@media print/);
  assert.match(source, /print-only/);
  assert.match(source, /lg:ml-auto/);
});

