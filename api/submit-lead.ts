/**
 * Vercel Serverless Function — POST /api/submit-lead
 *
 * Receives recommendation + assessment data from the React app and forwards
 * it to the WordPress REST endpoint POST /wp-json/osso/v1/leads.
 *
 * Required Vercel env vars:
 *   WP_SITE_URL          – e.g. "https://osso-testing-grounds.local" (no trailing slash)
 *   OSSO_LEAD_API_SECRET – must match the value in wp-config.php
 */

/* ── Lightweight request / response types (mirrors apple-route.ts) ── */

type JsonPrimitive = string | number | boolean | null;
type JsonMap = { [key: string]: JsonPrimitive | JsonPrimitive[] | JsonMap | JsonMap[] };
type RequestLike = { method?: string; headers: Record<string, string | undefined>; body?: unknown };
type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): void;
  end(): void;
  setHeader(name: string, value: string): void;
};

export const config = { runtime: "nodejs" };

/* ── Helpers ── */

function sendJson(res: ResponseLike, status: number, body: JsonMap): void {
  res.status(status).json(body);
}

function setCorsHeaders(req: RequestLike, res: ResponseLike): void {
  const origin = req.headers["origin"] ?? req.headers["Origin"] ?? "";
  const allowed = [
    "https://front-facing-program-builder.vercel.app",
  ];
  if (typeof origin === "string" && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function parseJsonBody(req: RequestLike): Promise<JsonMap> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body as JsonMap;
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = req as unknown as import("stream").Readable;
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    stream.on("error", reject);
  });
}

/* ── Required fields that WP expects ── */

const REQUIRED_FIELDS = ["first_name", "last_name", "work_email", "company"] as const;

/* ── Allowed fields to forward (prevents unexpected data) ── */

const ALLOWED_FIELDS = [
  "first_name",
  "last_name",
  "work_email",
  "company",
  "phone",
  "assessment_total_score",
  "assessment_maturity_level",
  "assessment_category_scores",
  "assessment_lowest_categories",
  "recommendation_service_tier",
  "recommendation_eu_package",
  "recommendation_posture_tier",
];

/* ── Handler ── */

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const wpUrl = process.env.WP_SITE_URL;
  const apiSecret = process.env.OSSO_LEAD_API_SECRET;

  if (!wpUrl || !apiSecret) {
    sendJson(res, 500, { error: "Server configuration error." });
    return;
  }

  let body: JsonMap;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    const val = body[field];
    if (typeof val !== "string" || val.trim() === "") {
      sendJson(res, 400, { error: `Missing required field: ${field}` });
      return;
    }
  }

  const payload: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      payload[key] = body[key];
    }
  }

  try {
    const wpRes = await fetch(
      `${wpUrl}/wp-json/osso/v1/leads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiSecret}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const wpBody = await wpRes.json();

    if (!wpRes.ok) {
      sendJson(res, wpRes.status, {
        error: (wpBody as JsonMap)?.error as string ?? "WordPress rejected the request.",
      });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("submit-lead WP proxy error:", err);
    sendJson(res, 502, { error: "Unable to reach the lead processing server." });
  }
}
