/**
 * submitLeadToWP — Sends lead + recommendation data through the Vercel
 * serverless proxy, which forwards it to WordPress REST API.
 */

export interface LeadPayload {
  first_name: string;
  last_name: string;
  work_email: string;
  company: string;
  phone?: string;
  assessment_total_score?: string;
  assessment_maturity_level?: string;
  assessment_category_scores?: string;
  assessment_lowest_categories?: string;
  recommendation_service_tier?: string;
  recommendation_eu_package?: string;
  recommendation_posture_tier?: string;
}

export interface LeadResult {
  ok: boolean;
  error?: string;
}

export async function submitLeadToWP(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch("/api/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data?.error ?? `Request failed (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.error("submitLeadToWP error:", err);
    return { ok: false, error: "Network error. Please try again." };
  }
}
