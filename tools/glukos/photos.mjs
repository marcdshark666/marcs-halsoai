// Google Photos PICKER API (photospicker.googleapis.com/v1).
// Library-API:ts läs-scope drogs in 31 mars 2025 (photoslibrary.readonly ger
// 403) – Picker-API:t är den sanktionerade vägen: Marc väljer själv bilderna
// i en Google-vy, vi får bara dem han valt. Verifierat mot docs 2026-09-29:
//   POST   /v1/sessions            → { id, pickerUri, pollingConfig{pollInterval,timeoutIn}, mediaItemsSet }
//   GET    /v1/sessions/{id}       → samma, mediaItemsSet=true när han är klar
//   GET    /v1/mediaItems?sessionId=…&pageSize=100 → { mediaItems[{ id, createTime, type, mediaFile{ baseUrl, mimeType, filename } }] }
//   DELETE /v1/sessions/{id}
// baseUrl kräver Authorization: Bearer och en storleksparameter (=w1600-h1600),
// och gäller i 60 minuter. Scope: photospicker.mediaitems.readonly.
import { GOOGLE_FILE, readJsonSafe, writeJsonPrivate } from "./config.mjs";

const API = "https://photospicker.googleapis.com/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export function loadGoogleConfig() {
  const cfg = readJsonSafe(GOOGLE_FILE);
  if (!cfg || !cfg.client_id || !cfg.refresh_token) return null;
  return cfg;
}

/** Hämtar en färsk access-token med refresh-tokenen. Skriver aldrig ut den. */
export async function getAccessToken(cfg) {
  const body = new URLSearchParams({
    client_id: cfg.client_id,
    client_secret: cfg.client_secret || "",
    refresh_token: cfg.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Google-token kunde inte förnyas (${res.status} ${data.error || ""}). Kör npm run google-login igen.`);
  }
  if (data.refresh_token && data.refresh_token !== cfg.refresh_token) {
    writeJsonPrivate(GOOGLE_FILE, { ...cfg, refresh_token: data.refresh_token });
  }
  return data.access_token;
}

async function call(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 200) }; }
  if (!res.ok) {
    const err = new Error(`Picker ${method} ${path}: ${res.status} ${data.error?.status || ""} ${data.error?.message || ""}`.trim());
    err.status = res.status;
    err.reason = data.error?.status;
    throw err;
  }
  return data;
}

export const createSession = (token, maxItemCount = 20) =>
  call(token, "POST", "/sessions", { pickingConfig: { maxItemCount: String(maxItemCount) } });
export const getSession = (token, id) => call(token, "GET", `/sessions/${encodeURIComponent(id)}`);
export const deleteSession = (token, id) => call(token, "DELETE", `/sessions/${encodeURIComponent(id)}`).catch(() => ({}));

export async function listMediaItems(token, sessionId) {
  const items = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({ sessionId, pageSize: "100", ...(pageToken ? { pageToken } : {}) });
    const data = await call(token, "GET", `/mediaItems?${q}`);
    items.push(...(data.mediaItems || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return items;
}

/** "5s" / "2.500s" → ms. */
export function parseDuration(d, fallbackMs) {
  const m = /^([\d.]+)s$/.exec(d || "");
  return m ? Math.round(parseFloat(m[1]) * 1000) : fallbackMs;
}

/** Hämtar bildbytes. Storleksparametern krävs; =w1600-h1600 räcker gott för matigenkänning. */
export async function downloadMedia(token, baseUrl, params = "=w1600-h1600") {
  const res = await fetch(`${baseUrl}${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Bildhämtning misslyckades (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Väntar tills Marc valt bilder eller tiden gått ut. `onTick` får antal sekunder kvar.
 * Returnerar sessionen (mediaItemsSet=true) eller null vid timeout.
 */
export async function waitForPick(token, session, { maxWaitMs, onTick = () => {} } = {}) {
  const pollMs = Math.max(5000, parseDuration(session.pollingConfig?.pollInterval, 5000));
  const apiTimeout = parseDuration(session.pollingConfig?.timeoutIn, 30 * 60 * 1000);
  const budget = Math.min(maxWaitMs || apiTimeout, apiTimeout);
  const deadline = Date.now() + budget;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const s = await getSession(token, session.id);
    if (s.mediaItemsSet) return s;
    onTick(Math.round((deadline - Date.now()) / 1000));
  }
  return null;
}
