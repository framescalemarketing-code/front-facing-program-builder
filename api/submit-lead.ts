/**
 * Vercel Serverless Function - POST /api/submit-lead
 *
 * Receives recommendation + assessment data from the React app and forwards
 * it to WordPress REST endpoint POST /wp-json/osso/v1/leads.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonMap = { [key: string]: JsonPrimitive | JsonPrimitive[] | JsonMap | JsonMap[] };
type RequestLike = {
  method?: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  on?: (event: string, listener: (chunk?: unknown) => void) => void;
};
type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): void;
  end(): void;
  setHeader(name: string, value: string): void;
};

export const config = { runtime: "nodejs" };

function sendJson(res: ResponseLike, status: number, body: JsonMap): void {
  res.status(status).json(body);
}

function setCorsHeaders(req: RequestLike, res: ResponseLike): void {
  const origin = req.headers["origin"] ?? req.headers["Origin"] ?? "";
  const allowed = [
    "https://front-facing-program-builder.vercel.app",
    "https://recommend.osso.com",
  ];

  if (typeof origin === "string" && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function decodeChunk(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (chunk instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(chunk);
  }
  return "";
}

async function parseJsonBody(req: RequestLike): Promise<JsonMap> {
  if (req.body && typeof req.body === "object") {
    return req.body as JsonMap;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body) as JsonMap;
  }

  if (typeof req.on === "function") {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      req.on?.("data", (chunk?: unknown) => {
        chunks.push(decodeChunk(chunk));
      });
      req.on?.("end", () => {
        try {
          resolve(JSON.parse(chunks.join("")) as JsonMap);
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on?.("error", () => reject(new Error("Invalid JSON")));
    });
  }

  throw new Error("Invalid JSON");
}

const REQUIRED_FIELDS = ["first_name", "last_name", "work_email", "company"] as const;

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
] as const;

function getEnvValue(key: string): string {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return maybeProcess?.env?.[key] ?? "";
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const wpUrl = getEnvValue("WP_SITE_URL");
  const apiSecret = getEnvValue("OSSO_LEAD_API_SECRET");

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
    const wpRes = await fetch(`${wpUrl}/wp-json/osso/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const wpBody = (await wpRes.json()) as JsonMap;

    if (!wpRes.ok) {
      sendJson(res, wpRes.status, {
        error: (typeof wpBody?.error === "string" ? wpBody.error : "WordPress rejected the request."),
      });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("submit-lead WP proxy error:", err);
    sendJson(res, 502, { error: "Unable to reach the lead processing server." });
  }
}
