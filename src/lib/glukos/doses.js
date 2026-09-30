// Doser från pumpen (Glooko) mot CGM-kurvan – ren logik utan React så samma
// kod körs i det nattliga jobbet och på sajten.
//
// URSPRUNG: observationsdelen av Sugar Buddys dosinsikt
// (sugar-buddy-bot, gren `dosinsikt`, src/lib/doseInsights.js):
// evaluateCorrection / evaluateMeal / evaluateNights och deras fönster
// (3 h verkan, 4 h uppföljning för låga värden, natt 23–06, störande dos/måltid
// utesluter). ALLT som där räknar procent, effektiv faktor, ny kvot eller ny
// basal är MEDVETET BORTTAGET.
//
// FÅR ALDRIG RÖRAS (samma regel som Sugar Buddy): ingen kod här räknar,
// föreslår eller antyder en insulindos, en ny kolhydratkvot, en ny
// korrektionsfaktor eller en ny basal. Resultatet är MÖNSTER i svensk text
// ("3 av 4 korrektioner följdes av …") att ta upp med diabetesteamet.
// Ett mönster kräver minst MIN_OBS bedömbara observationer.

const MIN = 60 * 1000;
const H = 60 * MIN;

export const LOW = 3.9;
export const HIGH = 10.0;
export const VERY_HIGH = 13.9;
export const CORRECTION_HORIZON_MIN = 180; // korrektionen ska ha verkat
export const MEAL_HORIZON_MIN = 180;       // måltiden ska vara "avklarad"
export const FOLLOWUP_MIN = 240;           // lågt värde inom detta räknas som dosens
export const MIN_OBS = 3;                  // minsta antal observationer för ett mönster
export const MIN_HITS = 2;                 // och minst så många träffar …
export const MIN_SHARE = 1 / 3;            // … som är minst en tredjedel
export const NIGHT_DRIFT_MMOL = 1.5;       // stig/fall över natten som räknas
export const BIG_MEAL_G = 60;              // "stor måltid" för kurva-mot-kolhydrater
export const LONG_HIGH_MIN = 180;          // "långvarigt högt" > 13,9 minst så länge
export const VERY_HIGH_DAY_PCT = 25;       // dygn med > 25 % av tiden > 13,9

export const DISCLAIMER =
  "Beslutsstöd, inte dosråd. Ta upp mönstret med diabetesteamet – ändra inga inställningar på egen hand.";

const round1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => (v == null ? "–" : String(round1(v)).replace(".", ","));
const num = (v) => {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
};
const ms = (x) => (typeof x === "number" ? x : Date.parse(x));

export function median(arr) {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Närmaste mätning inom ±toleranceMin, annars null (stigande serie [{t, mmol}]). */
export function bgNear(series, t, toleranceMin = 20) {
  if (!series || !series.length) return null;
  let lo = 0, hi = series.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  let best = null;
  for (const c of [series[lo], series[lo - 1]]) {
    if (c && (!best || Math.abs(c.t - t) < Math.abs(best.t - t))) best = c;
  }
  return best && Math.abs(best.t - t) <= toleranceMin * MIN ? best : null;
}

export function bgRange(series, from, to) {
  return (series || []).filter((p) => p.t >= from && p.t <= to).map((p) => p.mmol);
}

/** Bolus med kolhydrater = måltidsbolus, annars korrektion. */
export function bolusKind(b) {
  return num(b.carbs) > 0 ? "meal" : "correction";
}

/** Måltider = bolusar med kolhydrater + fotomåltider med uppskattade kolhydrater. */
function mealTimes(boluses, meals) {
  const out = [];
  for (const b of boluses || []) if (num(b.carbs) > 0) out.push(ms(b.time));
  for (const m of meals || []) if (num(m.carbs_g ?? m.carbs) > 0) out.push(ms(m.time));
  return out.filter(Number.isFinite);
}

// ------------------------------------------------------------ korrektion

/**
 * EN korrektionsbolus: värdet vid dosen, efter 3 h, förändringen och lägsta
 * värdet inom 4 h. Utesluts om en annan bolus kom inom 3 h efter eller en
 * måltid inom −15 min … +3 h (då går utfallet inte att läsa).
 */
export function evaluateCorrection(dose, series, { boluses = [], meals = [] } = {}) {
  const t0 = ms(dose.time);
  const base = { time: dose.time, kind: "correction", bg0: null, bg3: null, change3h: null, nadir: null, hypo: false, excluded: null, verdict: "no_data" };
  if (!Number.isFinite(t0)) return base;
  const p0 = bgNear(series, t0, 20);
  const p3 = bgNear(series, t0 + CORRECTION_HORIZON_MIN * MIN, 40);
  if (!p0 || !p3) return { ...base, bg0: p0 ? p0.mmol : null };

  const otherBolus = boluses.some((b) => {
    const t = ms(b.time);
    return t > t0 && t <= t0 + CORRECTION_HORIZON_MIN * MIN;
  });
  const meal = mealTimes(boluses, meals).some((t) => t >= t0 - 15 * MIN && t <= t0 + CORRECTION_HORIZON_MIN * MIN);
  const excluded = otherBolus ? "annan bolus inom 3 h" : meal ? "måltid inom 3 h" : null;

  const win = bgRange(series, t0, t0 + FOLLOWUP_MIN * MIN);
  const nadir = win.length ? Math.min(...win) : p3.mmol;
  const hypo = nadir < LOW;
  const verdict = hypo ? "low" : p3.mmol > HIGH ? "still_high" : "in_range";
  return {
    ...base,
    bg0: round1(p0.mmol), bg3: round1(p3.mmol), change3h: round1(p3.mmol - p0.mmol),
    nadir: round1(nadir), hypo, excluded, verdict,
  };
}

// --------------------------------------------------------------- måltid

/**
 * EN måltidsbolus: kurvan efter maten mot angivna kolhydrater. Topp inom
 * 2,5 h, värdet efter 3 h, lägsta inom 4 h. Utesluts om en ny bolus eller
 * måltid kom 30 min – 3 h efter.
 */
export function evaluateMealBolus(dose, series, { boluses = [], meals = [] } = {}) {
  const t0 = ms(dose.time);
  const carbs = num(dose.carbs);
  const base = { time: dose.time, kind: "meal", carbs, bg0: null, peak: null, rise: null, bg3: null, nadir: null, hypo: false, excluded: null, verdict: "no_data" };
  if (!Number.isFinite(t0)) return base;
  const p0 = bgNear(series, t0, 20);
  const p3 = bgNear(series, t0 + MEAL_HORIZON_MIN * MIN, 40);
  if (!p0 || !p3) return { ...base, bg0: p0 ? p0.mmol : null };

  const otherBolus = boluses.some((b) => {
    const t = ms(b.time);
    return t > t0 + 10 * MIN && t <= t0 + MEAL_HORIZON_MIN * MIN;
  });
  const laterMeal = mealTimes(boluses, meals).some((t) => t > t0 + 30 * MIN && t <= t0 + MEAL_HORIZON_MIN * MIN);
  const excluded = otherBolus ? "annan bolus inom 3 h" : laterMeal ? "ny måltid inom 3 h" : null;

  const peakWin = bgRange(series, t0, t0 + 150 * MIN);
  const peak = peakWin.length ? Math.max(...peakWin) : null;
  const win = bgRange(series, t0, t0 + FOLLOWUP_MIN * MIN);
  const nadir = win.length ? Math.min(...win) : p3.mmol;
  const hypo = nadir < LOW;
  const verdict = hypo ? "low" : p3.mmol > HIGH ? "still_high" : "in_range";
  return {
    ...base,
    bg0: round1(p0.mmol), peak: peak != null ? round1(peak) : null,
    rise: peak != null ? round1(peak - p0.mmol) : null,
    bg3: round1(p3.mmol), nadir: round1(nadir), hypo, excluded, verdict,
  };
}

// ---------------------------------------------------------------- natten

/**
 * EN natt tS (23:00) → tE (06:00). Lågt värde räknas alltid (säkerhet).
 * Stig/fall räknas bara för ostörda nätter: ingen bolus från 2 h före tS till
 * tE, ingen måltid från 2 h före tS till 2 h före tE, och dosdata måste finnas.
 */
export function evaluateNight(series, tS, tE, { boluses = [], meals = [], hasDoseData = true, date = null } = {}) {
  const s = bgNear(series, tS, 30);
  const e = bgNear(series, tE, 30);
  if (!s || !e) return null;
  const guardFrom = tS - 2 * H;
  const bolus = (boluses || []).some((b) => { const t = ms(b.time); return t >= guardFrom && t <= tE; });
  const meal = mealTimes([], meals).some((t) => t >= guardFrom && t <= tE - 2 * H)
    || mealTimes(boluses, []).some((t) => t >= guardFrom && t <= tE - 2 * H);
  const excluded = !hasDoseData ? "ingen dosdata" : bolus ? "bolus under natten" : meal ? "måltid under natten" : null;
  const win = bgRange(series, tS, tE);
  const nadir = win.length ? Math.min(...win) : Math.min(s.mmol, e.mmol);
  return {
    date, bgStart: round1(s.mmol), bgEnd: round1(e.mmol), delta: round1(e.mmol - s.mmol),
    nadir: round1(nadir), hypo: nadir < LOW, excluded,
  };
}

// ----------------------------------------------------- långvarigt högt

/**
 * Sammanhängande perioder > 13,9 (lucka ≤ 30 min tillåts) som varar minst
 * LONG_HIGH_MIN. `bolus` = om någon bolus registrerades under perioden.
 */
export function longHighEpisodes(series, boluses = [], { minMinutes = LONG_HIGH_MIN } = {}) {
  const runs = [];
  let start = null, last = null;
  const close = () => {
    if (start != null && last - start >= minMinutes * MIN) runs.push({ start, end: last });
    start = null; last = null;
  };
  for (const p of series || []) {
    if (p.mmol > VERY_HIGH) {
      if (start != null && p.t - last > 30 * MIN) close();
      if (start == null) start = p.t;
      last = p.t;
    } else if (start != null) {
      close();
    }
  }
  close();
  return runs.map((r) => ({
    start: r.start, end: r.end, minutes: Math.round((r.end - r.start) / MIN),
    bolus: (boluses || []).some((b) => { const t = ms(b.time); return t >= r.start && t <= r.end; }),
  }));
}

// ------------------------------------------------------------ dygnssumma

/** Registrerade doser för ett dygn – bara summering av det pumpen loggat. */
export function doseSummary(boluses = [], basals = []) {
  const bs = (boluses || []).filter((b) => num(b.units) > 0);
  const units = bs.reduce((a, b) => a + num(b.units), 0);
  const carbs = bs.reduce((a, b) => a + (num(b.carbs) > 0 ? num(b.carbs) : 0), 0);
  return {
    n_bolus: bs.length,
    n_meal: bs.filter((b) => bolusKind(b) === "meal").length,
    n_correction: bs.filter((b) => bolusKind(b) === "correction").length,
    bolus_units: Math.round(units * 10) / 10,
    carbs_g: Math.round(carbs),
    n_basal_changes: (basals || []).length,
  };
}

// --------------------------------------------------------------- mönster

/** Minst MIN_OBS observationer, minst MIN_HITS träffar som är ≥ MIN_SHARE. */
export function isPattern(hits, n) {
  return n >= MIN_OBS && hits >= MIN_HITS && hits / n >= MIN_SHARE;
}

const av = (hits, n, what) => `${hits} av ${n} ${what}`;

/**
 * Hittar mönster över ett fönster av dygn. Indata är redan bedömda poster.
 *   corrections / mealBoluses: från evaluateCorrection / evaluateMealBolus
 *   nights: från evaluateNight (null bortfiltrerade)
 *   dayStats: [{ date, veryHighPct }]
 *   longHighs: från longHighEpisodes (bara perioder med dosdata)
 * Returnerar [{ id, alert, hits, n, text }]. `alert` = värt ett Telegram-larm.
 * Texterna nämner aldrig enheter, doser, kvoter eller faktorer.
 */
export function findPatterns({ corrections = [], mealBoluses = [], nights = [], dayStats = [], longHighs = [] } = {}) {
  const out = [];
  const push = (id, alert, hits, n, text) => { if (isPattern(hits, n)) out.push({ id, alert, hits, n, text }); };

  const corr = corrections.filter((c) => !c.excluded && c.verdict !== "no_data");
  push("korr_lag", true, corr.filter((c) => c.hypo).length, corr.length,
    `${av(corr.filter((c) => c.hypo).length, corr.length, "korrektioner")} följdes av värde under 3,9 inom 4 h.`);
  const corrHigh = corr.filter((c) => !c.hypo && c.bg3 > HIGH);
  push("korr_kvar_hog", false, corrHigh.length, corr.length,
    `${av(corrHigh.length, corr.length, "korrektioner")} låg fortfarande över 10 efter 3 h (median ${fmt(median(corrHigh.map((c) => c.bg3)))} mmol/L).`);

  const meals = mealBoluses.filter((m) => !m.excluded && m.verdict !== "no_data");
  push("maltid_lag", true, meals.filter((m) => m.hypo).length, meals.length,
    `${av(meals.filter((m) => m.hypo).length, meals.length, "måltidsbolusar")} följdes av värde under 3,9 inom 4 h.`);
  const mealHigh = meals.filter((m) => !m.hypo && m.bg3 > HIGH);
  push("maltid_hog", false, mealHigh.length, meals.length,
    `${av(mealHigh.length, meals.length, "måltidsbolusar")} låg över 10 efter 3 h.`);
  const big = meals.filter((m) => m.carbs >= BIG_MEAL_G);
  const bigHigh = big.filter((m) => !m.hypo && m.bg3 > HIGH);
  push("maltid_stor_hog", false, bigHigh.length, big.length,
    `Efter måltider med minst ${BIG_MEAL_G} g kolhydrater låg värdet över 10 efter 3 h i ${bigHigh.length} av ${big.length} fall (median topp +${fmt(median(bigHigh.map((m) => m.rise)))} mmol/L).`);

  const withData = nights.filter(Boolean);
  const hypoNights = withData.filter((n) => n.hypo);
  push("natt_lag", true, hypoNights.length, withData.length,
    `${av(hypoNights.length, withData.length, "nätter")} hade värde under 3,9 mellan kl 23 och 06 (lägst ${fmt(Math.min(...hypoNights.map((n) => n.nadir)))} mmol/L).`);
  const calm = withData.filter((n) => !n.excluded);
  const rising = calm.filter((n) => n.delta > NIGHT_DRIFT_MMOL);
  const falling = calm.filter((n) => n.delta < -NIGHT_DRIFT_MMOL);
  push("natt_stiger", false, rising.length, calm.length,
    `Värdet steg mer än 1,5 mmol/L mellan kl 23 och 06 i ${rising.length} av ${calm.length} nätter utan bolus eller mat (median +${fmt(median(rising.map((n) => n.delta)))}).`);
  push("natt_sjunker", false, falling.length, calm.length,
    `Värdet sjönk mer än 1,5 mmol/L mellan kl 23 och 06 i ${falling.length} av ${calm.length} nätter utan bolus eller mat (median ${fmt(median(falling.map((n) => n.delta)))}).`);

  const ds = dayStats.filter((d) => Number.isFinite(d.veryHighPct));
  const hot = ds.filter((d) => d.veryHighPct > VERY_HIGH_DAY_PCT);
  push("hog_tid", true, hot.length, ds.length,
    `${av(hot.length, ds.length, "dygn")} hade mer än 25 % av tiden över 13,9 mmol/L.`);

  const noBolus = longHighs.filter((e) => !e.bolus);
  push("keton_risk", true, noBolus.length, longHighs.length,
    `${noBolus.length} av ${longHighs.length} perioder över 13,9 i minst 3 h hade ingen registrerad bolus – mönster med risk för ketoner. Följ din ketonrutin vid långvarigt högt värde.`);

  return out;
}

/** Säkerhetskontroll: text som nämner enheter, doser, kvot eller faktor. */
export const DOSE_TALK = /\b\d+([.,]\d+)?\s*(E|IE|IU|U|enheter|enhet|units?)\b|kolhydratkvot|korrektionsfaktor|\bkvot\b|\bfaktor\b|öka (basal|dos|bolus)|sänk (basal|dos|bolus)/i;

/** Kort Telegram-text (HTML) av larmvärda mönster, eller null. */
export function alertMessage(patterns, { date, url = "https://marcs-halsoai.vercel.app" } = {}) {
  const hits = (patterns || []).filter((p) => p.alert);
  if (!hits.length) return null;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    `🩸 <b>Mönster i blodsockret${date ? ` – ${esc(date)}` : ""}</b>`,
    ...hits.map((p) => `• ${esc(p.text)}`),
    "",
    `<i>${esc(DISCLAIMER)}</i>`,
    url,
  ].join("\n");
}
