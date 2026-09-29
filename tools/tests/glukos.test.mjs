// Handräknade fall för dygnsstatistiken och måltidsflaggorna.
//   node --test tools/tests/glukos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcStats, roundTo100, median, countLowEpisodes, dayPartStats, trendVsPrevious, toSeries,
} from "../../src/lib/glukos/stats.js";
import { mealInsight, nearest, stripDoseTalk, insightText } from "../../src/lib/glukos/meals.js";

const MIN = 60_000;
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const at = (min, mmol) => ({ t: T0 + min * MIN, mmol });

// ---------------------------------------------------------------- statistik

test("calcStats: handräknat på tio värden", () => {
  // 2.5 3.5 4 6 8 10 10 12 14 16 → sum 86, medel 8.6
  const s = calcStats([2.5, 3.5, 4, 6, 8, 10, 10, 12, 14, 16]);
  assert.equal(s.count, 10);
  assert.equal(s.avg, 8.6);
  assert.equal(s.median, 9); // (8 + 10) / 2
  assert.equal(s.min, 2.5);
  assert.equal(s.max, 16);
  // populations-SD: avvikelser² = 37.21 26.01 21.16 6.76 0.36 1.96 1.96 11.56 29.16 54.76 = 190.9 → /10 = 19.09 → sqrt = 4.369
  assert.equal(s.sd, 4.4);
  assert.equal(s.cv, 51); // 4.369/8.6 = 50.8 %
  // GMI: 3.31 + 0.02392 × (8.6 × 18.018 = 154.95) = 7.016 → 7.0
  assert.equal(s.gmi, 7.0);
  // bins: <3.0: 1 | 3.0–3.8: 1 | 3.9–10: 5 | 10.1–13.9: 1 | >13.9: 2
  assert.deepEqual(s.tir, { veryLow: 10, low: 10, inRange: 50, high: 10, veryHigh: 20 });
  assert.equal(Object.values(s.tir).reduce((a, b) => a + b, 0), 100);
});

test("calcStats: gränsvärden hamnar i rätt fack (3.9 och 10.0 är i mål)", () => {
  const s = calcStats([3.9, 10.0, 3.8, 10.1, 2.9, 3.0, 13.9, 14.0]);
  assert.deepEqual(s.tir, { veryLow: 13, low: 25, inRange: 25, high: 25, veryHigh: 12 });
  assert.equal(Object.values(s.tir).reduce((a, b) => a + b, 0), 100);
});

test("calcStats: tom lista → null", () => {
  assert.equal(calcStats([]), null);
  assert.equal(calcStats(null), null);
});

test("roundTo100: 33.3/33.3/33.4 → 33/33/34, summerar till 100", () => {
  const r = roundTo100([33.3, 33.3, 33.4, 0, 0]);
  assert.deepEqual(r, [33, 33, 34, 0, 0]);
  const r2 = roundTo100([12.5, 12.5, 37.5, 37.5, 0]);
  assert.equal(r2.reduce((a, b) => a + b, 0), 100);
});

test("median: udda och jämnt antal", () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("countLowEpisodes: två episoder, fem låga mätningar", () => {
  const s = [at(0, 5), at(5, 3.5), at(10, 3.2), at(15, 4.5), at(20, 3.8), at(25, 3.7), at(30, 3.6), at(35, 5)];
  assert.deepEqual(countLowEpisodes(s), { episodes: 2, readings: 5 });
});

test("countLowEpisodes: lucka över 30 min i ett lågt avsnitt räknas som ny episod", () => {
  const s = [at(0, 3.5), at(45, 3.5)];
  assert.equal(countLowEpisodes(s).episodes, 2);
});

test("dayPartStats: fördelar på fyra dygnsdelar efter timme", () => {
  const hourOf = (t) => Math.floor(((t - T0) / MIN / 60) % 24); // T0 = kl 00 i testklockan
  const s = [at(60, 5), at(120, 7), at(7 * 60, 12), at(13 * 60, 6), at(19 * 60, 3.5)];
  const parts = dayPartStats(s, hourOf);
  assert.equal(parts[0].avg, 6); // natt: 5, 7
  assert.equal(parts[0].tir, 100);
  assert.equal(parts[1].avg, 12); // morgon
  assert.equal(parts[1].tir, 0);
  assert.equal(parts[2].avg, 6);
  assert.equal(parts[3].avg, 3.5);
  assert.equal(parts[3].tir, 0);
});

test("trendVsPrevious: dagens medel mot snittet av tidigare dagar", () => {
  const today = { avg: 7.0, tir: { inRange: 70 } };
  const prev = [
    { avg: 8.0, tir: { inRange: 60 } },
    { avg: 8.0, tir: { inRange: 62 } },
    { avg: 8.0, tir: { inRange: 58 } },
  ];
  const t = trendVsPrevious(today, prev);
  assert.equal(t.days, 3);
  assert.equal(t.avgDelta, -1.0);
  assert.equal(t.tirDelta, 10);
  assert.equal(t.riktning, "ner");
  assert.equal(trendVsPrevious({ avg: 8.3, tir: { inRange: 60 } }, prev).riktning, "stabil");
  assert.equal(trendVsPrevious({ avg: 8.6, tir: { inRange: 60 } }, prev).riktning, "upp");
  assert.equal(trendVsPrevious(today, prev.slice(0, 2)).riktning, "okant");
});

test("toSeries: mg/dL → mmol/L, sorterad, ogiltiga bort", () => {
  const s = toSeries([
    { value_mgdl: 180, reading_time: "2026-01-01T12:05:00Z" },
    { value_mgdl: 90, reading_time: "2026-01-01T12:00:00Z" },
    { value_mgdl: 0, reading_time: "2026-01-01T12:10:00Z" },
  ]);
  assert.equal(s.length, 2);
  assert.equal(s[0].mmol, 5.0);
  assert.equal(s[1].mmol, 10.0);
});

// ------------------------------------------------------------------ måltider

// Full kurva 0–250 min var 5:e minut från en funktion.
const curve = (fn) => Array.from({ length: 54 }, (_, i) => at(-15 + i * 5, fn(-15 + i * 5)));

test("nearest: hittar närmaste inom tolerans, annars null", () => {
  const s = [at(0, 5), at(5, 6), at(10, 7)];
  assert.equal(nearest(s, T0 + 6 * MIN).mmol, 6);
  assert.equal(nearest(s, T0 + 40 * MIN), null);
});

test("mealInsight: högt vid 2 h och fortfarande stigande → for_lite", () => {
  // start 6, stiger 0.05/min → 2 h = 12 (stiger), 3 h = 15
  const s = curve((m) => (m <= 0 ? 6 : 6 + 0.05 * m));
  const i = mealInsight(s, T0);
  assert.equal(i.baseline, 6);
  assert.equal(i.at2h, 12);
  assert.equal(i.rising2h, true);
  assert.deepEqual(i.flags, ["for_lite"]);
  assert.equal(i.complete, true);
  assert.match(i.text, /för lite insulin/);
  assert.match(i.text, /diabetesteamet/);
});

test("mealInsight: 3 h > start + 3 utan att 2 h stiger → for_lite", () => {
  // start 6, topp 11 vid 90 min, planar ut på 9.5 (över 6+3)
  const s = curve((m) => (m <= 0 ? 6 : m <= 90 ? 6 + (5 * m) / 90 : Math.max(9.5, 11 - (m - 90) * 0.05)));
  const i = mealInsight(s, T0);
  assert.equal(i.at3h, 9.5);
  assert.equal(i.rising2h, false);
  assert.deepEqual(i.flags, ["for_lite"]);
});

test("mealInsight: 2 h = 11 men sjunkande och 3 h = 8 → ingen flagga", () => {
  // topp 13 vid 60 min, sjunker till 8 vid 180
  const s = curve((m) => (m <= 0 ? 6 : m <= 60 ? 6 + (7 * m) / 60 : Math.max(7.5, 13 - ((m - 60) * 5) / 120)));
  const i = mealInsight(s, T0);
  assert.equal(i.peak, 13);
  assert.equal(i.rise, 7);
  assert.equal(i.at2h, 10.5);
  assert.equal(i.rising2h, false);
  assert.equal(i.at3h, 8);
  assert.deepEqual(i.flags, []);
  assert.match(i.text, /inom det förväntade/);
});

test("mealInsight: värde under 3.9 inom 4 h → for_mycket", () => {
  // start 7, topp 9, sedan ner till 3.5 vid 200 min
  const s = curve((m) => (m <= 0 ? 7 : m <= 60 ? 7 + m / 30 : Math.max(3.5, 9 - ((m - 60) * 5.5) / 140)));
  const i = mealInsight(s, T0);
  assert.equal(i.hypoWithin4h, true);
  assert.equal(i.nadir, 3.5);
  assert.deepEqual(i.flags, ["for_mycket"]);
  assert.match(i.text, /för mycket insulin/);
});

test("mealInsight: både högt vid 3 h och lågt före 4 h → båda flaggorna", () => {
  const s = curve((m) => (m <= 0 ? 6 : m <= 180 ? 6 + (5 * m) / 180 : 3.0));
  const i = mealInsight(s, T0);
  assert.deepEqual(i.flags, ["for_lite", "for_mycket"]);
});

test("mealInsight: ofullständig kurva markeras preliminär", () => {
  const s = curve((m) => 6 + 0.02 * Math.max(0, m)).filter((p) => p.t <= T0 + 90 * MIN);
  const i = mealInsight(s, T0);
  assert.equal(i.complete, false);
  assert.equal(i.at3h, null);
  assert.match(i.text, /Preliminärt/);
});

test("mealInsight: ingen mätning nära måltiden → ingen bedömning", () => {
  const s = [at(60, 8), at(120, 9)];
  const i = mealInsight(s, T0);
  assert.equal(i.baseline, null);
  assert.deepEqual(i.flags, []);
  assert.match(i.text, /går inte att bedöma/);
});

test("mealInsight: nästa måltid inom 3 h → stord", () => {
  const s = curve((m) => 6);
  const i = mealInsight(s, T0, { nextMealAt: T0 + 100 * MIN });
  assert.equal(i.stord, true);
  assert.match(i.text, /kan inte tolkas ensam/);
  assert.equal(mealInsight(s, T0, { nextMealAt: T0 + 200 * MIN }).stord, false);
});

test("insightText nämner aldrig enheter eller doser", () => {
  const cases = [
    mealInsight(curve((m) => (m <= 0 ? 6 : 6 + 0.05 * m)), T0),
    mealInsight(curve((m) => (m <= 0 ? 7 : Math.max(3.2, 9 - m * 0.04))), T0),
    mealInsight(curve(() => 6), T0),
  ];
  for (const c of cases) {
    assert.doesNotMatch(c.text, /\d\s*(E|IE|IU|enheter|units?)\b/);
    assert.doesNotMatch(c.text, /\bdos(en|er|era)?\b/i);
  }
  assert.doesNotMatch(insightText({ baseline: null, flags: [] }), /enhet/);
});

test("stripDoseTalk tar bort meningar med enheter eller doser", () => {
  const t = stripDoseTalk("Pasta med köttfärssås, ca 60 g kolhydrater. Ta 6 E insulin till detta. Sallad utan kolhydrater.");
  assert.equal(t, "Pasta med köttfärssås, ca 60 g kolhydrater. Sallad utan kolhydrater.");
  assert.equal(stripDoseTalk("Bolusdosen bör ökas. Ris, kokt, 45 g."), "Ris, kokt, 45 g.");
  assert.equal(stripDoseTalk(""), "");
});
