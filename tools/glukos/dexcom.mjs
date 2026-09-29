// Dexcom Share – hämtar dygnets CGM-värden.
// URSPRUNG: kopia av sugar-buddy-bot/api/dexcom.js (login, fetchReadings,
// loginWithFallback, mapReadings) utan req/res-lagret. Samma värdar, samma
// applicationId, samma regionsfallback och samma "fel lösenord ⇒ prova inte
// andra regionen"-regel. Lösenordet används bara i inloggningsanropen och
// loggas aldrig.

const DEXCOM_HOSTS = {
  us: "https://share2.dexcom.com",
  ous: "https://shareous1.dexcom.com",
};

const APPLICATION_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";
const DEXCOM_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Dexcom Share/3.0.2.11",
};
const INVALID_SESSION = "00000000-0000-0000-0000-000000000000";

async function login(host, username, password) {
  const authRes = await fetch(`${host}/ShareWebServices/Services/General/AuthenticatePublisherAccount`, {
    method: "POST",
    headers: DEXCOM_HEADERS,
    body: JSON.stringify({ accountName: username, password, applicationId: APPLICATION_ID }),
  });
  if (!authRes.ok) {
    const txt = await authRes.text();
    const err = new Error(`Dexcom-inloggning misslyckades (${authRes.status})`);
    err.wrongPassword = /Password/i.test(txt);
    throw err;
  }
  const accountId = (await authRes.text()).replace(/"/g, "");
  if (!accountId || accountId === INVALID_SESSION) {
    const err = new Error("Fel Dexcom-användarnamn eller lösenord");
    err.wrongPassword = true;
    throw err;
  }
  const loginRes = await fetch(`${host}/ShareWebServices/Services/General/LoginPublisherAccountById`, {
    method: "POST",
    headers: DEXCOM_HEADERS,
    body: JSON.stringify({ accountId, password, applicationId: APPLICATION_ID }),
  });
  if (!loginRes.ok) {
    const txt = await loginRes.text();
    const err = new Error(`Dexcom-inloggning misslyckades (${loginRes.status})`);
    err.wrongPassword = /Password/i.test(txt);
    throw err;
  }
  const sessionId = (await loginRes.text()).replace(/"/g, "");
  if (!sessionId || sessionId === INVALID_SESSION) {
    throw new Error("Ogiltig Dexcom-session");
  }
  return sessionId;
}

async function fetchReadings(host, sessionId, minutes, maxCount) {
  const url = `${host}/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?sessionId=${sessionId}&minutes=${minutes}&maxCount=${maxCount}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "User-Agent": DEXCOM_HEADERS["User-Agent"] },
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Kunde inte hämta värden från Dexcom (${res.status})`);
    err.invalidSession = /SessionId|SessionNotValid|SessionIdNotFound/i.test(txt) || res.status === 401;
    throw err;
  }
  return res.json();
}

function parseDexcomDate(wt) {
  const match = /Date\((\d+)/.exec(wt || "");
  return match ? new Date(parseInt(match[1], 10)).toISOString() : new Date().toISOString();
}

export function mapReadings(raw) {
  return (Array.isArray(raw) ? raw : []).map((r) => ({
    value_mgdl: r.Value,
    trend: r.Trend,
    reading_time: parseDexcomDate(r.WT || r.ST || r.DT),
  }));
}

// Logga in mot primär region, annars (bara vid icke-lösenordsfel) den andra.
async function loginWithFallback(username, password, primaryRegion) {
  try {
    const sessionId = await login(DEXCOM_HOSTS[primaryRegion], username, password);
    return { sessionId, region: primaryRegion };
  } catch (e1) {
    if (e1.wrongPassword) throw e1;
    const other = primaryRegion === "ous" ? "us" : "ous";
    try {
      const sessionId = await login(DEXCOM_HOSTS[other], username, password);
      return { sessionId, region: other };
    } catch {
      throw e1;
    }
  }
}

/**
 * Hämtar de senaste `minutes` minuterna (max 1440 / 288 värden – Share ger
 * inte mer). Returnerar [{ value_mgdl, trend, reading_time }] nyast först.
 */
export async function fetchDexcomReadings({ username, password, region = "ous" }, { minutes = 1440, maxCount = 288 } = {}) {
  if (!username || !password) throw new Error("Dexcom-uppgifter saknas – kör npm run set-dexcom");
  const primaryRegion = region === "us" ? "us" : "ous";
  const mins = Math.min(Number(minutes) || 1440, 1440);
  const count = Math.min(Number(maxCount) || 288, 288);
  const { sessionId, region: usedRegion } = await loginWithFallback(username, password, primaryRegion);
  const raw = await fetchReadings(DEXCOM_HOSTS[usedRegion], sessionId, mins, count);
  return { readings: mapReadings(raw), region: usedRegion };
}
