#!/usr/bin/env node
// Det nattliga glukos- och matjobbet (schemalagt 23:55, MarcsHalsoAI-DagligGlukos).
//
//   npm run glukos                         dagens dygn: Dexcom → statistik → matbilder → bygg → deploy
//   npm run glukos -- --datum 2026-09-28   ett annat dygn (Dexcom Share ger bara 24 h bakåt – äldre
//                                          dygn räknas ur arkivet data/cgm/)
//   npm run glukos -- --utan-bilder        hoppa över Google Foto-steget
//   npm run glukos -- --bara-bilder        bara matbilder + kurvor (ingen ny Dexcom-hämtning)
//   npm run glukos -- --utan-deploy        skriv filerna men bygg/deploya inte
//   npm run glukos -- --syntetisk          TYDLIGT MARKERAD testdata → tools/tests/out/, deployar aldrig
//   npm run glukos -- --vanta-min 40       hur länge jobbet väntar på att Marc väljer bilder
//
// Glooko (npm run set-glooko): pumpens bolusar + basal lagras per dygn under
// `insulin`, mönster över 14 dygn under `patterns`, och ett Telegram-larm går
// max en gång per dygn när ett larmvärt mönster är nytt (data/glukos-larm.json).
// Saknas Dexcom men Glooko ger CGM används Glooko som blodsockerkälla.
//
// Inga hemligheter loggas. Dexcom-uppgifter, Google-token och Gemini-nyckel
// ligger i %APPDATA%\marcs-halsoai\ (se tools/glukos/config.mjs).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { PROJECT_ROOT, DEXCOM_FILE, GLOOKO_FILE, readJsonSafe, makeLogger } from "./glukos/config.mjs";
import { fetchDexcomReadings } from "./glukos/dexcom.mjs";
import { fetchGlooko } from "./glukos/glooko.mjs";
import { loadGoogleConfig, getAccessToken, createSession, waitForPick, listMediaItems, downloadMedia, deleteSession } from "./glukos/photos.mjs";
import { sendTelegram, escapeHtml } from "./glukos/telegram.mjs";
import { analyzeFood } from "./glukos/matbild.mjs";
import { makeThumbnail } from "./glukos/thumb.mjs";
import { bumpSeedVersion, build, deploy } from "./glukos/deploy.mjs";
import { calcStats, countLowEpisodes, dayPartStats, trendVsPrevious, toSeries } from "../src/lib/glukos/stats.js";
import { mealInsight } from "../src/lib/glukos/meals.js";
import {
  bolusKind, doseSummary, evaluateCorrection, evaluateMealBolus, evaluateNight, longHighEpisodes, findPatterns, alertMessage,
} from "../src/lib/glukos/doses.js";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// ---------------------------------------------------------------- argument
function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(name);

const SYNTETISK = has("--syntetisk");
const DATE = arg("--datum") || localDate(Date.now());
const UTAN_BILDER = has("--utan-bilder");
const BARA_BILDER = has("--bara-bilder");
const UTAN_DEPLOY = has("--utan-deploy") || SYNTETISK;
const VANTA_MIN = Number(arg("--vanta-min", process.env.GLUKOS_PICK_TIMEOUT_MIN || 40));

// Syntetiskt läge skriver ALDRIG i realdata eller public/ – bara i tools/tests/out/.
const OUT_ROOT = SYNTETISK ? path.join(PROJECT_ROOT, "tools", "tests", "out") : PROJECT_ROOT;
const PATHS = {
  archive: path.join(OUT_ROOT, "data", "cgm"),
  days: SYNTETISK ? path.join(OUT_ROOT, "GlucoseDay.syntetisk.json") : path.join(PROJECT_ROOT, "src", "api", "realdata", "GlucoseDay.json"),
  publicMat: path.join(OUT_ROOT, "public", "mat"),
  tmp: path.join(os.tmpdir(), "marcs-halsoai-glukos"),
  log: path.join(PROJECT_ROOT, "logs", "daglig-glukos.log"),
  alertState: path.join(OUT_ROOT, "data", "glukos-larm.json"),
};
const PATTERN_DAYS = 14;
const log = makeLogger(PATHS.log);

// ------------------------------------------------------------------ datum
function localDate(t) {
  return new Date(t).toLocaleDateString("sv-SE"); // YYYY-MM-DD i datorns tidszon
}
function dayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getTime();
}
function addDays(dateStr, n) {
  return localDate(dayStart(dateStr) + n * DAY + 12 * 60 * MIN);
}
function hhmm(t) {
  return new Date(t).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

// ------------------------------------------------------------------ lagring
function loadArchive(date) {
  return readJsonSafe(path.join(PATHS.archive, `${date}.json`), []);
}
function saveArchive(date, series) {
  fs.mkdirSync(PATHS.archive, { recursive: true });
  const byT = new Map(loadArchive(date).map((p) => [p.t, p]));
  for (const p of series) byT.set(p.t, { t: p.t, mmol: p.mmol });
  const merged = [...byT.values()].sort((a, b) => a.t - b.t);
  fs.writeFileSync(path.join(PATHS.archive, `${date}.json`), JSON.stringify(merged), "utf8");
  return merged;
}
function loadDays() {
  const rows = readJsonSafe(PATHS.days, []);
  return Array.isArray(rows) ? rows : [];
}
function saveDays(days) {
  // Tomma dygn (ingen statistik, inga måltider) ska inte bli tomma kort på sajten.
  for (let i = days.length - 1; i >= 0; i--) {
    if (!Number.isFinite(days[i].avg) && !(days[i].meals || []).length && !(days[i].insulin?.boluses || []).length) days.splice(i, 1);
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  fs.mkdirSync(path.dirname(PATHS.days), { recursive: true });
  fs.writeFileSync(PATHS.days, JSON.stringify(days, null, 1), "utf8");
}
function dayEntry(days, date) {
  let e = days.find((d) => d.date === date);
  if (!e) {
    e = { date, source: null, meals: [] };
    days.push(e);
  }
  if (!Array.isArray(e.meals)) e.meals = [];
  return e;
}

// ---------------------------------------------------------- syntetisk data
// En hel dags kurva ur en formel så UI:t och kurvlogiken kan provköras utan
// Dexcom. Märks "syntetisk" i varje post och deployas aldrig.
function syntheticSeries(date) {
  const t0 = dayStart(date);
  const bump = (m, start, height, riseMin, fallMin) => {
    const d = m - start;
    if (d < 0) return 0;
    if (d <= riseMin) return height * (d / riseMin);
    return Math.max(0, height * (1 - (d - riseMin) / fallMin));
  };
  const out = [];
  for (let i = 0; i < 288; i++) {
    const m = i * 5;
    let v = 6.4 + 0.8 * Math.sin((2 * Math.PI * (m - 300)) / 1440)
      + bump(m, 8 * 60, 4.5, 60, 120)          // frukost 08:00 – snäll kurva
      + bump(m, 12.5 * 60, 7.0, 110, 200)      // lunch 12:30 – högt och sent
      + bump(m, 18.5 * 60, 5.0, 60, 90)        // kvällsmat 18:30 …
      - bump(m, 21 * 60, 3.4, 60, 60)          // … följt av ett lågt värde ~22:00
      + 0.25 * Math.sin(i * 1.7);
    out.push({ t: t0 + m * MIN, mmol: Math.round(Math.max(2.4, v) * 10) / 10 });
  }
  return out;
}
function syntheticMeals(date) {
  const t0 = dayStart(date);
  const mk = (min, foods) => ({
    id: `syn_${date}_${min}`,
    media_id: null,
    time: new Date(t0 + min * MIN).toISOString(),
    photo: null,
    foods,
    carbs_g: foods.reduce((a, f) => a + f.kolhydrater_g, 0),
    confidence: "medel",
    comment: "SYNTETISK testmåltid – inte Marcs mat.",
    source: "syntetisk",
    insight: null,
  });
  return [
    mk(8 * 60, [{ namn: "SYNTETISK: havregrynsgröt", tillagning: "kokt", portion: "1 skål ~300 g", portion_g: 300, kolhydrater_g: 38 }]),
    mk(12.5 * 60, [
      { namn: "SYNTETISK: pasta", tillagning: "kokt", portion: "~250 g", portion_g: 250, kolhydrater_g: 70 },
      { namn: "SYNTETISK: köttfärssås", tillagning: "stekt", portion: "~150 g", portion_g: 150, kolhydrater_g: 8 },
    ]),
    mk(18.5 * 60, [{ namn: "SYNTETISK: pizza", tillagning: "bakad", portion: "½ pizza", portion_g: 220, kolhydrater_g: 65 }]),
  ];
}

// --------------------------------------------------------------- steg 1: CGM
async function glucoseStep(days, date, glooko = null) {
  const entry = dayEntry(days, date);
  let series;
  if (SYNTETISK) {
    series = saveArchive(date, syntheticSeries(date));
    entry.source = "syntetisk";
    entry.meals = syntheticMeals(date);
    log(`SYNTETISK dag ${date}: ${series.length} genererade värden.`);
  } else if (!BARA_BILDER) {
    const creds = readJsonSafe(DEXCOM_FILE);
    if ((!creds || !creds.username) && glooko?.readings?.length) {
      // En inloggning räcker: Glooko får vara blodsockerkällan när Dexcom saknas.
      const perDay = new Map();
      for (const p of glooko.readings) {
        const d = localDate(p.t);
        if (!perDay.has(d)) perDay.set(d, []);
        perDay.get(d).push(p);
      }
      for (const [d, s] of perDay) saveArchive(d, s);
      entry.source = "glooko";
      log(`Dexcom saknas – använder Glooko-CGM (${glooko.readings.length} värden).`);
    } else if (!creds || !creds.username) {
      log("Dexcom-uppgifter saknas (npm run set-dexcom) och Glooko gav ingen CGM – använder bara arkivet.");
    } else {
      const { readings, region } = await fetchDexcomReadings(creds, { minutes: 1440, maxCount: 288 });
      const all = toSeries(readings);
      log(`Dexcom (${region}): ${all.length} värden senaste 24 h.`);
      // Arkivera per lokalt dygn – värden efter midnatt tillhör nästa dygn.
      const perDay = new Map();
      for (const p of all) {
        const d = localDate(p.t);
        if (!perDay.has(d)) perDay.set(d, []);
        perDay.get(d).push(p);
      }
      for (const [d, s] of perDay) saveArchive(d, s);
      entry.source = "dexcom-share";
    }
    series = loadArchive(date);
  } else {
    series = loadArchive(date);
  }

  const start = dayStart(date), end = start + DAY;
  const inDay = series.filter((p) => p.t >= start && p.t < end);
  if (!inDay.length) {
    log(`Inga CGM-värden för ${date}.`);
    return entry;
  }
  const stats = calcStats(inDay.map((p) => p.mmol));
  const lows = countLowEpisodes(inDay);
  Object.assign(entry, {
    updated: new Date().toISOString(),
    count: stats.count,
    coverage_pct: Math.min(100, Math.round((stats.count / 288) * 100)),
    avg: stats.avg, median: stats.median, sd: stats.sd, cv: stats.cv,
    gmi: stats.gmi, gmiMmol: stats.gmiMmol, min: stats.min, max: stats.max,
    tir: stats.tir,
    lows,
    dayParts: dayPartStats(inDay),
  });
  if (entry.coverage_pct < 70) log(`Obs: bara ${entry.coverage_pct} % täckning för ${date}.`);
  log(`${date}: medel ${entry.avg}, TIR ${entry.tir.inRange} %, låga episoder ${lows.episodes}.`);
  return entry;
}

// ----------------------------------------------------- steg 2: matbilder
async function photosStep(days, date) {
  const cfg = loadGoogleConfig();
  if (!cfg) {
    log("Google Foto ej kopplat (npm run google-login) – hoppar över matbilder.");
    return 0;
  }
  const token = await getAccessToken(cfg);
  const session = await createSession(token, 20);
  log(`Picker-session skapad (${session.id.slice(0, 8)}…). Väntar max ${VANTA_MIN} min.`);
  let added = 0;
  try {
    const msg =
      `🍽️ <b>Dagens matbilder – ${escapeHtml(date)}</b>\n` +
      `Tryck och bocka för dagens matfoton så hamnar de på hälsosidan med kurvan efter maten.\n` +
      `<a href="${session.pickerUri}">Öppna Google Foto och välj</a>\n` +
      `Jobbet väntar ${VANTA_MIN} min, sedan går sidan ut utan bilder.`;
    if (!(await sendTelegram(msg))) log("Telegram gick inte att nå – länken loggas inte (innehåller sessions-id).");

    const done = await waitForPick(token, session, { maxWaitMs: VANTA_MIN * MIN });
    if (!done) {
      log("Inga bilder valda inom tiden.");
      return 0;
    }
    const items = (await listMediaItems(token, session.id)).filter((it) => it.type === "PHOTO" || /^image\//.test(it.mediaFile?.mimeType || ""));
    log(`${items.length} bild(er) valda.`);
    const known = new Set(days.flatMap((d) => (d.meals || []).map((m) => m.media_id)).filter(Boolean));
    fs.mkdirSync(PATHS.tmp, { recursive: true });

    for (const it of items) {
      if (known.has(it.id)) { log(`  hoppar över redan tolkad bild ${it.id.slice(0, 8)}…`); continue; }
      const t = Date.parse(it.createTime);
      if (Number.isNaN(t)) { log("  bild utan createTime – hoppar över"); continue; }
      const mealDate = localDate(t);
      const shortId = crypto.createHash("sha1").update(it.id).digest("hex").slice(0, 10);
      const tmpFile = path.join(PATHS.tmp, `${shortId}.jpg`);
      try {
        fs.writeFileSync(tmpFile, await downloadMedia(token, it.mediaFile.baseUrl, "=w1600-h1600"));
        const food = await analyzeFood(tmpFile, { log });
        const rel = `/mat/${mealDate}/${shortId}.jpg`;
        makeThumbnail(tmpFile, path.join(PATHS.publicMat, mealDate, `${shortId}.jpg`), 600);
        const entry = dayEntry(days, mealDate);
        entry.meals.push({
          id: `m_${shortId}`, media_id: it.id, time: new Date(t).toISOString(), photo: rel,
          foods: food.foods, carbs_g: food.carbs_g, confidence: food.confidence, comment: food.comment,
          source: food.source, insight: null,
        });
        added++;
        log(`  ${mealDate} ${hhmm(t)}: ${food.foods.map((f) => f.namn).join(", ") || "inget igenkänt"} (~${food.carbs_g} g, ${food.source}).`);
      } catch (e) {
        log(`  bild ${shortId} misslyckades: ${e.message}`);
      } finally {
        try { fs.unlinkSync(tmpFile); } catch { /* redan borta */ }
      }
    }
    if (added) {
      const rader = days.flatMap((d) => d.meals || [])
        .filter((m) => m.media_id && [...items].some((it) => it.id === m.media_id))
        .map((m) => `• ${hhmm(Date.parse(m.time))} ${escapeHtml(m.foods.map((f) => f.namn).join(", ") || "okänt")} ~${m.carbs_g} g`);
      await sendTelegram(`✅ <b>${added} måltid(er) tolkade</b>\n${rader.join("\n")}\nKurvorna läggs på marcs-halsoai.vercel.app.`);
    }
  } finally {
    await deleteSession(token, session.id);
  }
  return added;
}

// ------------------------------------------------- steg 3: kurvor & flaggor
function insightsStep(days, dates) {
  for (const date of dates) {
    const entry = days.find((d) => d.date === date);
    if (!entry || !entry.meals?.length) continue;
    const series = [addDays(date, -1), date, addDays(date, 1)]
      .flatMap((d) => loadArchive(d))
      .sort((a, b) => a.t - b.t);
    entry.meals.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    entry.meals.forEach((meal, i) => {
      const t = Date.parse(meal.time);
      const next = entry.meals[i + 1] ? Date.parse(entry.meals[i + 1].time) : null;
      meal.insight = mealInsight(series, t, { nextMealAt: next });
    });
    log(`${date}: ${entry.meals.length} måltid(er) bedömda (${entry.meals.filter((m) => m.insight?.flags?.length).length} med flagga).`);
  }
}

// ------------------------------------------------------------ steg 4: trend
function trendStep(days, date) {
  const entry = days.find((d) => d.date === date);
  if (!entry || !Number.isFinite(entry.avg)) return;
  const prev = days.filter((d) => d.date < date && Number.isFinite(d.avg)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);
  entry.trend = trendVsPrevious(entry, prev);
}

// ------------------------------------------------------ steg 0: Glooko
// Hämtar gårdagen + dagen (så sena kvällsdoser får hela uppföljningen).
async function glookoFetch(date) {
  const creds = readJsonSafe(GLOOKO_FILE);
  if (!creds || !creds.email || !creds.password) {
    log("Glooko ej kopplat (npm run set-glooko) – inga insulindoser.");
    return null;
  }
  const startMs = dayStart(addDays(date, -1));
  const endMs = Math.min(Date.now(), dayStart(date) + DAY);
  const r = await fetchGlooko(creds, { startMs, endMs });
  log(`Glooko (${r.server}): ${r.readings.length} CGM, ${r.boluses.length} bolusar, ${r.basals.length} basalposter.`);
  log(`  endpoints: ${r.diag.join(" · ")}`);
  return r;
}

function syntheticBoluses(date) {
  const t0 = dayStart(date);
  const at = (min) => new Date(t0 + min * MIN).toISOString();
  return [
    { time: at(8 * 60), units: 2.5, carbs: 38 },
    { time: at(12.5 * 60), units: 5.2, carbs: 78 },
    { time: at(15.75 * 60), units: 1.5, carbs: null },   // korrektion efter hög lunch
    { time: at(18.5 * 60), units: 4.3, carbs: 65 },
  ];
}

// ------------------------------------------------- steg 1b: insulindoser
function insulinStep(days, date, glooko) {
  let perDay = new Map();
  if (SYNTETISK) {
    perDay.set(date, { boluses: syntheticBoluses(date), basals: [{ time: new Date(dayStart(date)).toISOString(), rate: 0.9 }] });
  } else if (glooko) {
    for (const b of glooko.boluses) {
      const d = localDate(Date.parse(b.time));
      if (!perDay.has(d)) perDay.set(d, { boluses: [], basals: [] });
      perDay.get(d).boluses.push(b);
    }
    for (const b of glooko.basals) {
      const d = localDate(Date.parse(b.time));
      if (!perDay.has(d)) perDay.set(d, { boluses: [], basals: [] });
      perDay.get(d).basals.push(b);
    }
    // Dygn i hämtfönstret utan doser: markera att data finns (0 bolusar är också data).
    for (const d of [addDays(date, -1), date]) if (!perDay.has(d)) perDay.set(d, { boluses: [], basals: [] });
  } else {
    return;
  }
  for (const [d, { boluses, basals }] of perDay) {
    const entry = dayEntry(days, d);
    const prev = entry.insulin || {};
    const byT = new Map((prev.boluses || []).map((b) => [b.time, b]));
    for (const b of boluses) byT.set(b.time, { time: b.time, units: b.units, carbs: b.carbs ?? null, kind: bolusKind(b) });
    const merged = [...byT.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    const basT = new Map((prev.basals || []).map((b) => [b.time, b]));
    for (const b of basals) basT.set(b.time, { time: b.time, rate: b.rate });
    const mergedBasals = [...basT.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    entry.insulin = {
      ...prev,
      source: SYNTETISK ? "syntetisk" : "glooko",
      updated: new Date().toISOString(),
      boluses: merged,
      basals: mergedBasals,
      summary: doseSummary(merged, mergedBasals),
    };
    log(`${d}: ${merged.length} bolusar (${entry.insulin.summary.n_meal} måltid, ${entry.insulin.summary.n_correction} korrektion).`);
  }
}

// ---------------------------------------------- steg 5: dosmönster (14 d)
function doseAnalysisStep(days, date) {
  const windowDates = [];
  for (let i = PATTERN_DAYS - 1; i >= 0; i--) windowDates.push(addDays(date, -i));
  const series = [addDays(date, -PATTERN_DAYS), ...windowDates, addDays(date, 1)]
    .flatMap((d) => loadArchive(d))
    .sort((a, b) => a.t - b.t);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const allBoluses = [addDays(date, -PATTERN_DAYS), ...windowDates, addDays(date, 1)]
    .flatMap((d) => byDate.get(d)?.insulin?.boluses || []);
  const allMeals = [addDays(date, -PATTERN_DAYS), ...windowDates, addDays(date, 1)]
    .flatMap((d) => byDate.get(d)?.meals || []);
  const ctx = { boluses: allBoluses, meals: allMeals };

  const corrections = [], mealBoluses = [], nights = [], dayStats = [], longHighs = [];
  for (const d of windowDates) {
    const entry = byDate.get(d);
    const hasDoses = !!entry?.insulin;
    if (hasDoses) {
      const bs = entry.insulin.boluses || [];
      entry.insulin.corrections = bs.filter((b) => b.kind === "correction").map((b) => evaluateCorrection(b, series, ctx));
      entry.insulin.mealBoluses = bs.filter((b) => b.kind === "meal").map((b) => evaluateMealBolus(b, series, ctx));
      corrections.push(...entry.insulin.corrections);
      mealBoluses.push(...entry.insulin.mealBoluses);
      const start = dayStart(d), end = start + DAY;
      longHighs.push(...longHighEpisodes(series, allBoluses).filter((e) => e.start >= start && e.start < end));
    }
    const prevHasDoses = !!byDate.get(addDays(d, -1))?.insulin;
    const night = evaluateNight(
      series,
      new Date(`${addDays(d, -1)}T23:00:00`).getTime(),
      new Date(`${d}T06:00:00`).getTime(),
      { ...ctx, hasDoseData: hasDoses && prevHasDoses, date: d },
    );
    if (night) {
      nights.push(night);
      if (entry) entry.night = night;
    }
    if (entry && entry.tir) dayStats.push({ date: d, veryHighPct: entry.tir.veryHigh });
  }

  const items = findPatterns({ corrections, mealBoluses, nights, dayStats, longHighs });
  const entry = byDate.get(date);
  if (!entry) return [];
  entry.patterns = {
    updated: new Date().toISOString(),
    from: windowDates[0], to: date, days: PATTERN_DAYS,
    counts: {
      corrections: corrections.filter((c) => !c.excluded && c.verdict !== "no_data").length,
      mealBoluses: mealBoluses.filter((m) => !m.excluded && m.verdict !== "no_data").length,
      nights: nights.length,
      calmNights: nights.filter((n) => !n.excluded).length,
      days: dayStats.length,
      longHighs: longHighs.length,
    },
    items,
  };
  log(`Mönster ${windowDates[0]}–${date}: ${items.length} (${items.filter((p) => p.alert).length} larmvärda).`);
  return items;
}

// ------------------------------------------------- steg 6: Telegram-larm
// Max ett larm per dygn, och bara när ett larmvärt mönster är nytt, har fler
// träffar än förra gången eller inte larmats på 7 dygn.
async function alertStep(date, patterns) {
  const alertable = (patterns || []).filter((p) => p.alert);
  if (!alertable.length) return;
  const state = readJsonSafe(PATHS.alertState, { lastDate: null, sent: {} }) || { lastDate: null, sent: {} };
  if (state.lastDate === date) { log("Larm redan skickat i dag – hoppar över."); return; }
  const fresh = alertable.filter((p) => {
    const s = state.sent?.[p.id];
    return !s || p.hits > s.hits || dayStart(date) - dayStart(s.date) >= 7 * DAY;
  });
  if (!fresh.length) { log("Larmvärda mönster oförändrade sedan senaste larmet – inget nytt skickas."); return; }
  const msg = alertMessage(alertable, { date });
  if (SYNTETISK) { log(`[SYNTETISK – skickas inte] ${msg.replace(/<[^>]+>/g, "").replace(/\n+/g, " | ")}`); return; }
  if (!(await sendTelegram(msg))) { log("Mönsterlarmet kunde inte skickas (Telegram)."); return; }
  const sent = { ...(state.sent || {}) };
  for (const p of alertable) sent[p.id] = { hits: p.hits, n: p.n, date };
  fs.mkdirSync(path.dirname(PATHS.alertState), { recursive: true });
  fs.writeFileSync(PATHS.alertState, JSON.stringify({ lastDate: date, sent }, null, 1), "utf8");
  log(`Mönsterlarm skickat (${alertable.map((p) => p.id).join(", ")}).`);
}

// -------------------------------------------------------------------- main
async function main() {
  log(`=== daglig-glukos ${DATE}${SYNTETISK ? " [SYNTETISK]" : ""}${BARA_BILDER ? " [bara bilder]" : ""} ===`);
  const days = loadDays();

  let glooko = null;
  if (!SYNTETISK && !BARA_BILDER) {
    try {
      glooko = await glookoFetch(DATE);
    } catch (e) {
      log(`Glooko-steget misslyckades: ${e.message}`);
    }
  }
  try {
    await glucoseStep(days, DATE, glooko);
  } catch (e) {
    log(`Dexcom-steget misslyckades: ${e.message}`);
  }
  try {
    insulinStep(days, DATE, glooko);
  } catch (e) {
    log(`Insulinsteget misslyckades: ${e.message}`);
  }
  saveDays(days);

  if (!UTAN_BILDER && !SYNTETISK) {
    try {
      await photosStep(days, DATE);
    } catch (e) {
      log(`Fotosteget misslyckades: ${e.message}`);
    }
    saveDays(days);
  }

  insightsStep(days, [addDays(DATE, -1), DATE]);
  trendStep(days, DATE);
  let patterns = [];
  try {
    patterns = doseAnalysisStep(days, DATE);
  } catch (e) {
    log(`Mönsteranalysen misslyckades: ${e.message}`);
  }
  saveDays(days);
  try {
    await alertStep(DATE, patterns);
  } catch (e) {
    log(`Mönsterlarmet misslyckades: ${e.message}`);
  }
  log(`Skrivet: ${path.relative(PROJECT_ROOT, PATHS.days)} (${days.length} dygn).`);

  if (UTAN_DEPLOY) {
    log("Ingen deploy (--utan-deploy/--syntetisk).");
    return;
  }
  try {
    const v = bumpSeedVersion(DATE);
    log(`SEED_VERSION → ${v}`);
    build({ log });
    const url = deploy({ log });
    log(`Live: ${url}`);
  } catch (e) {
    log(`Bygg/deploy misslyckades: ${e.message}`);
    process.exitCode = 2;
  }
}

main().catch((e) => {
  log(`OVÄNTAT FEL: ${e.stack || e.message}`);
  process.exitCode = 1;
});
