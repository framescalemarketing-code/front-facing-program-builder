/* global fetch */

type HeaderValue = string | string[] | undefined;

type RequestLike = {
  method?: string;
  headers?: Record<string, HeaderValue>;
  body?: unknown;
  on?: (event: string, listener: (arg?: unknown) => void) => void;
};

type ResponseLike = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

type RouteRequest = {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
};

type JsonMap = Record<string, unknown>;

function sendJson(res: ResponseLike, status: number, body: JsonMap) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function setCorsHeaders(req: RequestLike, res: ResponseLike) {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : "*";
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseJsonBody(req: RequestLike): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let raw = "";
    req.on?.("data", (chunk) => {
      raw += String(chunk ?? "");
    });
    req.on?.("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch (err) {
        reject(err);
      }
    });
    req.on?.("error", reject);
  });
}

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function parseDistanceMeters(route: JsonMap) {
  const direct = asNumber(route.distanceMeters ?? route.distance);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const summary = route.summary as JsonMap | undefined;
  const fromSummary = asNumber(summary?.distanceMeters ?? summary?.distance);
  if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;

  return NaN;
}

function parseDurationSeconds(route: JsonMap) {
  const direct = asNumber(route.expectedTravelTime ?? route.durationSeconds ?? route.duration);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const summary = route.summary as JsonMap | undefined;
  const fromSummary = asNumber(summary?.expectedTravelTime ?? summary?.durationSeconds ?? summary?.duration);
  if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;

  return NaN;
}

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const token = (process.env.APPLE_MAPS_JWT ?? "").trim();
    if (!token) {
      sendJson(res, 503, { error: "Apple routing unavailable: APPLE_MAPS_JWT is not configured." });
      return;
    }

    const body = (await parseJsonBody(req)) as RouteRequest | null;
    const originLat = asNumber(body?.origin?.lat);
    const originLon = asNumber(body?.origin?.lon);
    const destinationLat = asNumber(body?.destination?.lat);
    const destinationLon = asNumber(body?.destination?.lon);

    if (![originLat, originLon, destinationLat, destinationLon].every((n) => Number.isFinite(n))) {
      sendJson(res, 400, { error: "Invalid origin or destination coordinates." });
      return;
    }

    const url = new URL("https://maps-api.apple.com/v1/directions");
    url.searchParams.set("origin", `${originLat},${originLon}`);
    url.searchParams.set("destination", `${destinationLat},${destinationLon}`);
    url.searchParams.set("transportType", "automobile");
    url.searchParams.set("returnRoutes", "true");

    const appleResp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!appleResp.ok) {
      const detail = await appleResp.text();
      sendJson(res, appleResp.status, { error: "Apple routing request failed.", detail });
      return;
    }

    const payload = (await appleResp.json()) as JsonMap;
    const routes = Array.isArray(payload.routes) ? (payload.routes as JsonMap[]) : [];
    const best = routes
      .map((route) => ({
        distanceMeters: parseDistanceMeters(route),
        durationSeconds: parseDurationSeconds(route),
      }))
      .filter((route) => Number.isFinite(route.distanceMeters) && route.distanceMeters > 0)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

    if (!best) {
      sendJson(res, 502, { error: "Apple routing returned no usable routes." });
      return;
    }

    sendJson(res, 200, {
      miles: best.distanceMeters / 1609.344,
      minutes: Number.isFinite(best.durationSeconds) && best.durationSeconds > 0 ? Math.round(best.durationSeconds / 60) : 0,
      source: "apple",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown server error";
    sendJson(res, 500, { error: msg });
  }
}

