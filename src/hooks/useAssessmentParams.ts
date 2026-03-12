/**
 * useAssessmentParams — Reads assessment data from the URL hash query string.
 *
 * When users arrive from the WordPress assessment page, the URL looks like:
 *   https://front-facing-program-builder.vercel.app
 *     #recommendation?source=assessment&score=18&maturity=Managed
 *     &first_name=Jane&last_name=Doe&email=jane@acme.com&company=Acme
 *     &setup_hints=["employer_base_with_upgrades"]&budget_hint=good_budget
 */

import { useMemo } from "react";
import type { CurrentSafetySetup, ProgramBudgetPreference } from "@/lib/programConfig";

export interface AssessmentParams {
  source: string | null;
  score: number | null;
  maturity: string | null;
  categories: Array<{ key: string; name: string; score: number }> | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  setupHints: CurrentSafetySetup[] | null;
  budgetHint: ProgramBudgetPreference | null;
}

function parseHashParams(): URLSearchParams {
  const hash = window.location.hash; // e.g. "#recommendation?source=assessment&score=18"
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(qIndex + 1));
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const VALID_BUDGETS: ProgramBudgetPreference[] = [
  "super_strict",
  "low_budget",
  "good_budget",
  "unlimited_budget",
];

export function useAssessmentParams(): AssessmentParams & { hasAssessmentContext: boolean } {
  return useMemo(() => {
    const p = parseHashParams();
    const scoreRaw = p.get("score");
    const budgetRaw = p.get("budget_hint");

    const params: AssessmentParams = {
      source: p.get("source"),
      score: scoreRaw ? Number(scoreRaw) : null,
      maturity: p.get("maturity"),
      categories: safeJsonParse(p.get("categories")),
      firstName: p.get("first_name"),
      lastName: p.get("last_name"),
      email: p.get("email"),
      company: p.get("company"),
      phone: p.get("phone"),
      setupHints: safeJsonParse(p.get("setup_hints")),
      budgetHint: budgetRaw && VALID_BUDGETS.includes(budgetRaw as ProgramBudgetPreference)
        ? (budgetRaw as ProgramBudgetPreference)
        : null,
    };

    return {
      ...params,
      hasAssessmentContext: params.source === "assessment" && params.score !== null,
    };
  }, []);
}
