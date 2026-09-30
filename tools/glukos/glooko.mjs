// Glooko (inofficiellt API) – kopia av Sugar Buddys api/glooko.js anpassad för
// Node: samma sign_in, EU/US-server, kandidat-endpoints per datatyp och
// normalisering. `diag` säger vilken endpoint som svarade – utan uppgifter.
// Lösenord och sessionskaka skrivs ALDRIG ut eller loggas.

export const SERVERS = {
  eu: "https://eu.api.glooko.com",
  us: "https://api.glooko.com",
};

const UA = "Mozilla/5.0 (MarcsHalsoAI) AppleWebKit/537.36";
const toIso = (d) => new Date(d).toISOString();

function cookiesFrom(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function signIn(base, email, password) {
  const res = await fetch(`${base}/api/v2/users/sign_in`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({
      userLogin: { email, password },
      deviceInformation: { applicationType: "logbook", os: "android", osVersion: "33" },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 401 || res.status === 403 || res.status === 422) {
    throw Object.assign(new Error("Fel e-post eller lösenord till Glooko (eller fel server EU/US)."), { code: "auth" });
  }
  if (!res.ok) throw new Error(`Glooko-inloggningen misslyckades (HTTP ${res.status}).`);
  const data = await res.json().catch(() => ({}));
  const code = data?.userLogin?.glookoCode || data?.userLogin?.glooko_code || data?.glookoCode || null;
  const cookie = cookiesFrom(res);
  if (!cookie) throw new Error("Glooko gav ingen session.");
  return { cookie, code };
}

async function tryGet(base, cookie, paths, diag, tag) {
  for (const p of paths) {
    const label = `${tag} ${p.split("?")[0]}`;
    try {
      const res = await fetch(`${base}${p}`, {
        headers: { cookie, "user-agent": UA, accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      diag.push(`${label} → ${res.status}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) return data;
      }
    } catch (e) {
      diag.push(`${label} → ${e.name === "TimeoutError" ? "timeout" : "nätfel"}`);
    }
  }
  return null;
}

const arr = (data, keys) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  return [];
};

/** Glukosvärde → mmol/L. Glooko kan ge mmol, mg/dL eller mg/dL×100. */
export function toMmol(r) {
  if (Number.isFinite(Number(r.mmol))) return Number(r.mmol);
  const v = Number(r.value);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v > 1000) return v / 100 / 18.018; // mg/dL × 100
  if (v > 35) return v / 18.018;         // mg/dL
  return v;                              // redan mmol/L
}

export function normalize({ cgmRaw, bolusRaw, basalRaw }) {
  const readings = arr(cgmRaw, ["readings", "cgmReadings", "bgs", "data"])
    .map((r) => {
      const t = Date.parse(r.timestamp || r.displayTime || r.pumpTimestamp || r.time || r.readingTime || r.date);
      const mmol = toMmol(r);
      return Number.isFinite(t) && mmol != null && mmol >= 1 && mmol <= 35 ? { t, mmol: Math.round(mmol * 10) / 10 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);

  const boluses = arr(bolusRaw, ["normalBoluses", "insulins", "boluses", "data"])
    .map((b) => {
      const t = b.timestamp || b.pumpTimestamp || b.displayTime || b.time || b.date;
      const units = Number(b.insulinDelivered ?? b.units ?? b.value ?? b.totalInsulin ?? b.amount);
      const carbs = Number(b.carbsInput ?? b.carbs);
      return t && !Number.isNaN(Date.parse(t)) && Number.isFinite(units) && units > 0
        ? { time: toIso(t), units: Math.round(units * 100) / 100, carbs: Number.isFinite(carbs) && carbs > 0 ? carbs : null }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  const basals = arr(basalRaw, ["scheduledBasals", "basals", "data"])
    .map((b) => {
      const t = b.timestamp || b.pumpTimestamp || b.time || b.date;
      const rate = Number(b.rate ?? b.value ?? b.units);
      return t && !Number.isNaN(Date.parse(t)) && Number.isFinite(rate) ? { time: toIso(t), rate } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  return { readings, boluses, basals };
}

/**
 * Hämtar CGM, bolusar och basal i intervallet [startMs, endMs].
 * creds = { email, password, server: "eu" | "us" }.
 */
export async function fetchGlooko(creds, { startMs, endMs }) {
  const server = creds.server === "us" ? "us" : "eu";
  const base = SERVERS[server];
  if (!creds.email || !creds.password) throw new Error("Glooko-uppgifter saknas (npm run set-glooko).");
  const { cookie, code } = await signIn(base, creds.email, creds.password);
  const qs = `patient=${encodeURIComponent(code || "")}&startDate=${encodeURIComponent(toIso(startMs))}&endDate=${encodeURIComponent(toIso(endMs))}`;
  const diag = [];
  const cgmRaw = await tryGet(base, cookie, [
    `/api/v2/cgm/readings?${qs}`,
    `/api/v3/cgm/readings?${qs}`,
    `/api/v2/bgs?${qs}`,
    `/api/v2/bg/readings?${qs}`,
  ], diag, "cgm");
  const bolusRaw = await tryGet(base, cookie, [
    `/api/v2/normal_boluses?${qs}`,
    `/api/v2/insulins?${qs}`,
    `/api/v3/insulins?${qs}`,
    `/api/v2/pumps/normal_boluses?${qs}`,
  ], diag, "bolus");
  const basalRaw = await tryGet(base, cookie, [
    `/api/v2/scheduled_basals?${qs}`,
    `/api/v2/pumps/scheduled_basals?${qs}`,
  ], diag, "basal");
  return { server, ...normalize({ cgmRaw, bolusRaw, basalRaw }), diag };
}
