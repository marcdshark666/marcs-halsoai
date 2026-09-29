// Dygnsstatistik för CGM-värden (mmol/L). Ren logik utan React så samma kod
// körs i det nattliga jobbet (tools/daglig-glukos.js) och i sajten.
//
// URSPRUNG: kopierat från Sugar Buddy (sugar-buddy-bot/src/lib/glucose.js
// calcStats + roundTo100 och src/lib/analysis.js DAY_PARTS/summarize).
// Algoritmerna är oförändrade; enda anpassningen är att funktionerna här
// returnerar TAL (inte toFixed-strängar) eftersom resultatet sparas som JSON.
// Ändra tröskelvärden bara om du också ändrar dem i Sugar Buddy.

export const MGDL_PER_MMOL = 18.018;
export const mgdlToMmol = (mgdl) => mgdl / MGDL_PER_MMOL;

// Internationell konsensus (Battelino 2019): <3.0 / 3.0–3.8 / 3.9–10.0 / 10.1–13.9 / >13.9.
export const VERY_LOW = 3.0;
export const LOW = 3.9;
export const HIGH = 10.0;
export const VERY_HIGH = 13.9;

// Samma fyra dygnsdelar som Sugar Buddys analys.js (lokal tid).
export const DAY_PARTS = [
  { id: "night", label: "Natt", range: "kl 00–06", from: 0, to: 6 },
  { id: "morning", label: "Morgon", range: "kl 06–12", from: 6, to: 12 },
  { id: "afternoon", label: "Eftermiddag", range: "kl 12–18", from: 12, to: 18 },
  { id: "evening", label: "Kväll", range: "kl 18–24", from: 18, to: 24 },
];

const round1 = (v) => Math.round(v * 10) / 10;

// Rundar procenttal som summerar till 100 till heltal som fortfarande summerar
// till 100 (största-rest-metoden) – kopia av Sugar Buddys roundTo100.
export function roundTo100(parts) {
  const floors = parts.map((p) => Math.floor(p));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = parts
    .map((p, i) => ({ i, frac: p - Math.floor(p) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder -= 1;
  }
  return result;
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return null;
  const mid = Math.floor(n / 2);
  return n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Statistik för en lista mmol/L-värden. Motsvarar Sugar Buddys calcStats med
 * lowMmol=3.9 / highMmol=10.0 men returnerar tal.
 */
export function calcStats(valuesMmol) {
  const values = (valuesMmol || []).filter((v) => Number.isFinite(v));
  const n = values.length;
  if (!n) return null;

  const veryLowCount = values.filter((v) => v < VERY_LOW).length;
  const lowCount = values.filter((v) => v >= VERY_LOW && v < LOW).length;
  const inRange = values.filter((v) => v >= LOW && v <= HIGH).length;
  const highCount = values.filter((v) => v > HIGH && v <= VERY_HIGH).length;
  const veryHighCount = values.filter((v) => v > VERY_HIGH).length;

  const avg = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / n;
  const sd = Math.sqrt(variance);
  const cv = (sd / avg) * 100;

  // GMI (Bergenstal 2018): 3.31 + 0.02392 × medel i mg/dL. Samma formel som Sugar Buddy.
  const avgMgdl = avg * MGDL_PER_MMOL;
  const gmi = Math.round((3.31 + 0.02392 * avgMgdl) * 10) / 10;
  const gmiMmol = Math.max(0, Math.round(gmi * 10.929 - 23.53));

  const [veryLow, low, inRangePct, high, veryHigh] = roundTo100([
    (veryLowCount / n) * 100,
    (lowCount / n) * 100,
    (inRange / n) * 100,
    (highCount / n) * 100,
    (veryHighCount / n) * 100,
  ]);

  return {
    count: n,
    avg: round1(avg),
    median: round1(median(values)),
    sd: round1(sd),
    cv: Math.round(cv),
    gmi,
    gmiMmol,
    min: round1(min),
    max: round1(max),
    tir: { veryLow, low, inRange: inRangePct, high, veryHigh },
  };
}

/**
 * Antal låga episoder: sammanhängande mätningar < 3.9 räknas som EN episod.
 * En lucka > 30 min mellan två låga mätningar startar en ny episod.
 * `series` = [{ t (ms), mmol }] i tidsordning.
 */
export function countLowEpisodes(series, threshold = LOW) {
  let episodes = 0;
  let readings = 0;
  let inLow = false;
  let lastLowT = null;
  for (const p of series) {
    if (p.mmol < threshold) {
      readings++;
      if (!inLow || (lastLowT != null && p.t - lastLowT > 30 * 60 * 1000)) episodes++;
      inLow = true;
      lastLowT = p.t;
    } else {
      inLow = false;
    }
  }
  return { episodes, readings };
}

/** Medel + TIR per dygnsdel. `hourOf(t)` ger lokal timme – injiceras för testbarhet. */
export function dayPartStats(series, hourOf = (t) => new Date(t).getHours()) {
  return DAY_PARTS.map((part) => {
    const vals = series.filter((p) => {
      const h = hourOf(p.t);
      return h >= part.from && h < part.to;
    }).map((p) => p.mmol);
    const n = vals.length;
    if (!n) return { id: part.id, label: part.label, range: part.range, n: 0, avg: null, tir: null };
    const avg = vals.reduce((a, b) => a + b, 0) / n;
    const inR = vals.filter((v) => v >= LOW && v <= HIGH).length;
    return { id: part.id, label: part.label, range: part.range, n, avg: round1(avg), tir: Math.round((inR / n) * 100) };
  });
}

/**
 * Trend mot föregående dagar: dagens medel/TIR mot medlet av upp till sju
 * tidigare dagar. Under tre jämförelsedagar → riktning "okant".
 */
export function trendVsPrevious(today, previousDays) {
  const prev = (previousDays || []).filter((d) => d && Number.isFinite(d.avg) && d.tir);
  const days = prev.length;
  if (days < 3) return { days, avgDelta: null, tirDelta: null, riktning: "okant" };
  const prevAvg = prev.reduce((a, d) => a + d.avg, 0) / days;
  const prevTir = prev.reduce((a, d) => a + d.tir.inRange, 0) / days;
  const avgDelta = round1(today.avg - prevAvg);
  const tirDelta = Math.round(today.tir.inRange - prevTir);
  const riktning = avgDelta > 0.5 ? "upp" : avgDelta < -0.5 ? "ner" : "stabil";
  return { days, avgDelta, tirDelta, riktning };
}

/** Dexcom-läsningar ({ value_mgdl, reading_time }) → stigande [{ t, mmol }]. */
export function toSeries(readings = []) {
  const out = [];
  for (const r of readings) {
    const t = new Date(r.reading_time).getTime();
    const v = Number(r.value_mgdl);
    if (!Number.isNaN(t) && Number.isFinite(v) && v > 0) out.push({ t, mmol: round1(mgdlToMmol(v)) });
  }
  return out.sort((a, b) => a.t - b.t);
}
