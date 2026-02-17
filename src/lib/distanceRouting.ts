export type LatLon = { lat: number; lon: number };
type NominatimResult = { lat?: string | number; lon?: string | number };
type OSRMResponse = { routes?: Array<{ distance?: number; duration?: number }> };

function safeNumber(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

export async function geocodeWithNominatim(loc: {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<LatLon> {
  const street = loc.streetAddress.trim();
  const city = loc.city.trim();
  const state = loc.state.trim();
  const zip = loc.zipCode.trim();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("street", street);
  url.searchParams.set("city", city);
  url.searchParams.set("state", state);
  if (zip) url.searchParams.set("postalcode", zip);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) throw new Error(`Geocoding failed (${resp.status}).`);

  const data = (await resp.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) throw new Error("No result found for this address.");

  const [first] = data as NominatimResult[];
  const lat = safeNumber(first?.lat);
  const lon = safeNumber(first?.lon);

  if (!lat || !lon) throw new Error("Geocoding returned an invalid location.");

  return { lat, lon };
}

async function routeWithOSRMProvider(
  baseHost: string,
  origin: LatLon,
  destination: LatLon
): Promise<{ miles: number; minutes: number }> {
  const baseUrl =
    `${baseHost}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

  const buildUrl = (includeAlternatives: boolean) => {
    const url = new URL(baseUrl);
    url.searchParams.set("overview", "false");
    if (includeAlternatives) url.searchParams.set("alternatives", "true");
    url.searchParams.set("steps", "false");
    url.searchParams.set("annotations", "false");
    return url;
  };

  let resp = await fetch(buildUrl(true).toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!resp.ok && resp.status === 400) {
    resp = await fetch(buildUrl(false).toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  if (!resp.ok) throw new Error(`Routing failed (${resp.status}).`);

  const data = (await resp.json()) as OSRMResponse;
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const best = routes
    .map((r) => ({
      distance: safeNumber(r?.distance),
      duration: safeNumber(r?.duration),
    }))
    .filter((r) => r.distance && r.duration)
    .sort((a, b) => a.distance - b.distance)[0];

  const meters = best?.distance ?? 0;
  const seconds = best?.duration ?? 0;

  if (!meters || !seconds) throw new Error("Routing returned an invalid result.");

  return {
    miles: meters / 1609.344,
    minutes: Math.round(seconds / 60),
  };
}

async function routeWithAppleProvider(origin: LatLon, destination: LatLon): Promise<{ miles: number; minutes: number }> {
  const resp = await fetch("/api/apple-route", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ origin, destination }),
  });

  if (!resp.ok) throw new Error(`Apple routing failed (${resp.status}).`);

  const data = (await resp.json()) as { miles?: unknown; minutes?: unknown };
  const miles = safeNumber(data?.miles);
  const minutes = safeNumber(data?.minutes);
  if (!miles) throw new Error("Apple routing returned an invalid result.");

  return { miles, minutes: Math.max(0, Math.round(minutes)) };
}

export async function routeWithOSRM(origin: LatLon, destination: LatLon): Promise<{ miles: number; minutes: number }> {
  const results = await Promise.all([
    (async () => {
      try {
        return await routeWithAppleProvider(origin, destination);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await routeWithOSRMProvider("https://router.project-osrm.org", origin, destination);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await routeWithOSRMProvider("https://routing.openstreetmap.de/routed-car", origin, destination);
      } catch {
        return null;
      }
    })(),
  ]);

  const valid = results.filter((r): r is { miles: number; minutes: number } => Boolean(r));
  if (valid.length === 0) {
    throw new Error("Routing failed (all providers unavailable).");
  }

  return valid.sort((a, b) => a.miles - b.miles)[0];
}
