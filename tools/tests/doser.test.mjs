// Handräknade fall för dosanalysen (src/lib/glukos/doses.js) och Glooko-normaliseringen.
//   node --test tools/tests/doser.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCorrection, evaluateMealBolus, evaluateNight, longHighEpisodes, doseSummary,
  findPatterns, isPattern, alertMessage, bolusKind, DOSE_TALK, DISCLAIMER,
} from "../../src/lib/glukos/doses.js";
import { normalize, toMmol } from "../glukos/glooko.mjs";

const MIN = 60_000;
const T0 = Date.UTC(2026, 8, 29, 12, 0, 0);
const iso = (min) => new Date(T0 + min * MIN).toISOString();
/** Serie var 5:e minut från `from` till `to` (min) med värde f(min). */
const curve = (from, to, f) => {
  const out = [];
  for (let m = from; m <= to; m += 5) out.push({ t: T0 + m * MIN, mmol: f(m) });
  return out;
};
// Linjär interpolation mellan brytpunkter [[min, mmol], …].
const lin = (pts) => (m) => {
  for (let i = 1; i < pts.length; i++) {
    const [m0, v0] = pts[i - 1], [m1, v1] = pts[i];
    if (m <= m1) return Math.round((v0 + ((v1 - v0) * (m - m0)) / (m1 - m0)) * 10) / 10;
  }
  return pts[pts.length - 1][1];
};

// ------------------------------------------------------------ korrektion

test("korrektion: 14 → 7 på 3 h, inget lågt → in_range, förändring −7", () => {
  const s = curve(-30, 300, lin([[-30, 14], [0, 14], [180, 7], [300, 7]]));
  const r = evaluateCorrection({ time: iso(0), units: 2 }, s);
  assert.equal(r.bg0, 14);
  assert.equal(r.bg3, 7);
  assert.equal(r.change3h, -7);
  assert.equal(r.nadir, 7);
  assert.equal(r.hypo, false);
  assert.equal(r.verdict, "in_range");
  assert.equal(r.excluded, null);
  // Inga procent, faktorer eller nya doser i resultatet.
  for (const k of ["pct", "isfEff", "suggestion", "newIsf"]) assert.ok(!(k in r), k);
});

test("korrektion: 12 → 4,5 vid 3 h men 3,4 vid 3,5 h → lågt inom 4 h", () => {
  const s = curve(-30, 300, lin([[0, 12], [180, 4.5], [210, 3.4], [300, 5]]));
  const r = evaluateCorrection({ time: iso(0), units: 2 }, s);
  assert.equal(r.bg3, 4.5);
  assert.equal(r.nadir, 3.4);
  assert.equal(r.hypo, true);
  assert.equal(r.verdict, "low");
});

test("korrektion: lågt värde efter 4 h räknas inte (utanför fönstret)", () => {
  const s = curve(-30, 330, lin([[0, 12], [240, 5], [270, 3.5], [330, 3.5]]));
  assert.equal(evaluateCorrection({ time: iso(0), units: 2 }, s).hypo, false);
});

test("korrektion: fortfarande 11,5 efter 3 h → still_high", () => {
  const s = curve(-30, 300, lin([[0, 15], [180, 11.5], [300, 11]]));
  const r = evaluateCorrection({ time: iso(0), units: 1 }, s);
  assert.equal(r.verdict, "still_high");
  assert.equal(r.change3h, -3.5);
});

test("korrektion: annan bolus inom 3 h eller måltid → utesluten", () => {
  const s = curve(-30, 300, () => 10);
  const dose = { time: iso(0), units: 1 };
  assert.equal(evaluateCorrection(dose, s, { boluses: [dose, { time: iso(90), units: 1 }] }).excluded, "annan bolus inom 3 h");
  assert.equal(evaluateCorrection(dose, s, { meals: [{ time: iso(60), carbs_g: 40 }] }).excluded, "måltid inom 3 h");
  // Bolus efter 3 h stör inte.
  assert.equal(evaluateCorrection(dose, s, { boluses: [dose, { time: iso(200), units: 1 }] }).excluded, null);
});

test("korrektion: saknas värde vid 3 h → no_data", () => {
  const s = curve(-30, 100, () => 12);
  assert.equal(evaluateCorrection({ time: iso(0), units: 1 }, s).verdict, "no_data");
});

// ---------------------------------------------------------------- måltid

test("måltidsbolus: 6 → topp 12 vid 1 h → 11 vid 3 h, 70 g → still_high, stigning +6", () => {
  const s = curve(-30, 300, lin([[0, 6], [60, 12], [180, 11], [300, 9]]));
  const r = evaluateMealBolus({ time: iso(0), units: 5, carbs: 70 }, s);
  assert.equal(r.bg0, 6);
  assert.equal(r.peak, 12);
  assert.equal(r.rise, 6);
  assert.equal(r.bg3, 11);
  assert.equal(r.carbs, 70);
  assert.equal(r.verdict, "still_high");
  assert.equal(bolusKind({ carbs: 70 }), "meal");
  assert.equal(bolusKind({ carbs: null }), "correction");
});

test("måltidsbolus: ny måltid 1 h efter → utesluten; bolus inom 10 min (delad) stör inte", () => {
  const s = curve(-30, 300, () => 8);
  const dose = { time: iso(0), units: 4, carbs: 50 };
  assert.equal(evaluateMealBolus(dose, s, { boluses: [dose, { time: iso(60), units: 2, carbs: 20 }] }).excluded, "annan bolus inom 3 h");
  assert.equal(evaluateMealBolus(dose, s, { boluses: [dose, { time: iso(5), units: 1 }] }).excluded, null);
  assert.equal(evaluateMealBolus(dose, s, { meals: [{ time: iso(90), carbs_g: 30 }] }).excluded, "ny måltid inom 3 h");
});

// ----------------------------------------------------------------- natten

test("natt: 7 → 9,5 utan bolus → +2,5, inget lågt, ostörd", () => {
  const tS = T0, tE = T0 + 7 * 60 * MIN;
  const s = curve(-60, 7 * 60 + 30, lin([[0, 7], [420, 9.5]]));
  const n = evaluateNight(s, tS, tE, { boluses: [], meals: [] });
  assert.equal(n.bgStart, 7);
  assert.equal(n.bgEnd, 9.5);
  assert.equal(n.delta, 2.5);
  assert.equal(n.hypo, false);
  assert.equal(n.excluded, null);
});

test("natt: dopp till 3,6 kl ~03 → hypo; bolus 22:00 → utesluten från drift men lågt räknas", () => {
  const tS = T0, tE = T0 + 420 * MIN;
  const s = curve(-60, 450, lin([[0, 6], [240, 3.6], [420, 6]]));
  const n = evaluateNight(s, tS, tE, { boluses: [{ time: iso(-60), units: 1 }] });
  assert.equal(n.nadir, 3.6);
  assert.equal(n.hypo, true);
  assert.equal(n.excluded, "bolus under natten");
  assert.equal(evaluateNight(s, tS, tE, { hasDoseData: false }).excluded, "ingen dosdata");
});

// ------------------------------------------------------ långvarigt högt

test("långvarigt högt: 14,5 i 3 h 20 min utan bolus, 15 i 1 h räknas inte", () => {
  const s = [
    ...curve(0, 200, () => 14.5),    // 0–200 min över 13,9 → 200 min
    ...curve(205, 300, () => 9),
    ...curve(305, 365, () => 15),    // bara 60 min
  ];
  const e = longHighEpisodes(s, []);
  assert.equal(e.length, 1);
  assert.equal(e[0].minutes, 200);
  assert.equal(e[0].bolus, false);
  assert.equal(longHighEpisodes(s, [{ time: iso(100), units: 2 }])[0].bolus, true);
});

// ------------------------------------------------------------ dygnssumma

test("doseSummary: 3 bolusar = 2,5 + 5,2 + 1,5 = 9,2; 38 + 78 g = 116 g", () => {
  const s = doseSummary([
    { units: 2.5, carbs: 38 }, { units: 5.2, carbs: 78 }, { units: 1.5, carbs: null },
  ], [{ rate: 0.9 }]);
  assert.deepEqual(s, { n_bolus: 3, n_meal: 2, n_correction: 1, bolus_units: 9.2, carbs_g: 116, n_basal_changes: 1 });
});

// ---------------------------------------------------------------- mönster

const corr = (hypo, bg3 = 7, extra = {}) => ({ kind: "correction", verdict: hypo ? "low" : bg3 > 10 ? "still_high" : "in_range", hypo, bg3, excluded: null, ...extra });

test("isPattern: minst 3 observationer, 2 träffar, ≥ 1/3", () => {
  assert.equal(isPattern(2, 2), false);   // för få observationer
  assert.equal(isPattern(1, 3), false);   // en träff räcker inte
  assert.equal(isPattern(2, 3), true);
  assert.equal(isPattern(2, 7), false);   // 2/7 < 1/3
  assert.equal(isPattern(3, 9), true);    // exakt en tredjedel
});

test("mönster: 3 av 4 korrektioner följdes av lågt → larmvärt, exakt text", () => {
  const p = findPatterns({ corrections: [corr(true), corr(true), corr(true), corr(false)] });
  const k = p.find((x) => x.id === "korr_lag");
  assert.ok(k);
  assert.equal(k.alert, true);
  assert.equal(k.text, "3 av 4 korrektioner följdes av värde under 3,9 inom 4 h.");
});

test("mönster: 2 korrektioner (båda låga) räcker INTE – minst 3 observationer", () => {
  assert.equal(findPatterns({ corrections: [corr(true), corr(true)] }).length, 0);
});

test("mönster: uteslutna och no_data räknas inte som observationer", () => {
  const items = [corr(true), corr(true), corr(false, 7, { excluded: "måltid inom 3 h" }), { verdict: "no_data", hypo: false, excluded: null }];
  assert.equal(findPatterns({ corrections: items }).length, 0);
});

test("mönster: korrektioner kvar över 10 → informativt (inget larm), median 11,5", () => {
  const p = findPatterns({ corrections: [corr(false, 11), corr(false, 12), corr(false, 7)] });
  const k = p.find((x) => x.id === "korr_kvar_hog");
  assert.equal(k.alert, false);
  assert.equal(k.text, "2 av 3 korrektioner låg fortfarande över 10 efter 3 h (median 11,5 mmol/L).");
});

test("mönster: stora måltider (≥ 60 g) över 10 efter 3 h i 2 av 3", () => {
  const m = (carbs, bg3, rise) => ({ kind: "meal", verdict: bg3 > 10 ? "still_high" : "in_range", hypo: false, carbs, bg3, rise, excluded: null });
  const p = findPatterns({ mealBoluses: [m(70, 11, 6), m(80, 12, 7), m(65, 8, 3), m(20, 7, 2)] });
  const big = p.find((x) => x.id === "maltid_stor_hog");
  assert.equal(big.text, "Efter måltider med minst 60 g kolhydrater låg värdet över 10 efter 3 h i 2 av 3 fall (median topp +6,5 mmol/L).");
  assert.equal(p.find((x) => x.id === "maltid_hog").text, "2 av 4 måltidsbolusar låg över 10 efter 3 h.");
});

test("mönster: nattlågt 2 av 4 nätter (larm), stigande natt 3 av 3 ostörda", () => {
  const n = (delta, nadir, excluded = null) => ({ delta, nadir, hypo: nadir < 3.9, excluded });
  const p = findPatterns({ nights: [n(0.5, 3.5, "bolus under natten"), n(2, 3.7), n(2.2, 5), n(1.8, 6)] });
  assert.equal(p.find((x) => x.id === "natt_lag").text, "2 av 4 nätter hade värde under 3,9 mellan kl 23 och 06 (lägst 3,5 mmol/L).");
  assert.equal(p.find((x) => x.id === "natt_lag").alert, true);
  assert.equal(p.find((x) => x.id === "natt_stiger").text,
    "Värdet steg mer än 1,5 mmol/L mellan kl 23 och 06 i 3 av 3 nätter utan bolus eller mat (median +2).");
});

test("mönster: > 25 % över 13,9 i 2 av 5 dygn → larm; exakt 25 % räknas inte", () => {
  const d = (v) => ({ veryHighPct: v });
  assert.equal(findPatterns({ dayStats: [d(30), d(26), d(25), d(10), d(0)] }).find((x) => x.id === "hog_tid").text,
    "2 av 5 dygn hade mer än 25 % av tiden över 13,9 mmol/L.");
  assert.equal(findPatterns({ dayStats: [d(30), d(25), d(25)] }).length, 0);
});

test("mönster: ketonrisk 2 av 3 långa höga perioder utan bolus", () => {
  const p = findPatterns({ longHighs: [{ bolus: false }, { bolus: false }, { bolus: true }] });
  const k = p.find((x) => x.id === "keton_risk");
  assert.equal(k.alert, true);
  assert.match(k.text, /^2 av 3 perioder över 13,9 i minst 3 h hade ingen registrerad bolus/);
});

test("inga mönstertexter nämner enheter, doser, kvot eller faktor", () => {
  const n = (delta, nadir) => ({ delta, nadir, hypo: nadir < 3.9, excluded: null });
  const m = (carbs, bg3, hypo) => ({ kind: "meal", verdict: hypo ? "low" : "still_high", hypo, carbs, bg3, rise: 5, excluded: null });
  const all = findPatterns({
    corrections: [corr(true), corr(true), corr(false, 12), corr(false, 12)],
    mealBoluses: [m(70, 12, false), m(70, 12, false), m(70, 3, true), m(70, 3, true)],
    nights: [n(3, 3.5), n(-3, 3.6), n(3, 5), n(-3, 5)],
    dayStats: [{ veryHighPct: 40 }, { veryHighPct: 40 }, { veryHighPct: 0 }],
    longHighs: [{ bolus: false }, { bolus: false }, { bolus: false }],
  });
  assert.equal(all.length, 10);
  for (const p of all) assert.doesNotMatch(p.text, DOSE_TALK, p.text);
  const msg = alertMessage(all, { date: "2026-09-29" });
  assert.doesNotMatch(msg.replace(/https?:\S+/g, ""), DOSE_TALK);
  assert.ok(msg.includes(DISCLAIMER));
  // Bara larmvärda mönster i meddelandet.
  assert.ok(!msg.includes("fortfarande över 10"));
  assert.ok(msg.includes("3,9 inom 4 h"));
});

test("DOSE_TALK fångar dosråd (självtest av spärren)", () => {
  for (const bad of ["Ta 2 E till", "öka basal med 10 %", "ny kolhydratkvot 1:12", "3 enheter", "sänk dos"]) {
    assert.match(bad, DOSE_TALK, bad);
  }
});

test("alertMessage: inga larmvärda mönster → null", () => {
  assert.equal(alertMessage([{ id: "maltid_hog", alert: false, text: "x" }]), null);
  assert.equal(alertMessage([]), null);
});

// ---------------------------------------------------------------- Glooko

test("Glooko toMmol: mmol, mg/dL och mg/dL×100", () => {
  assert.equal(toMmol({ value: 7.2 }), 7.2);
  assert.equal(Math.round(toMmol({ value: 180.18 }) * 10) / 10, 10);      // 180,18 / 18,018 = 10
  assert.equal(Math.round(toMmol({ value: 18018 }) * 10) / 10, 10);       // ×100
  assert.equal(toMmol({ mmol: 5.5 }), 5.5);
  assert.equal(toMmol({ value: 0 }), null);
});

test("Glooko normalize: bolusar med/utan kolhydrater, sorterade; nollbolus bort", () => {
  const r = normalize({
    cgmRaw: { readings: [{ timestamp: "2026-09-29T10:05:00Z", value: 126.1 }, { timestamp: "2026-09-29T10:00:00Z", value: 7 }] },
    bolusRaw: { normalBoluses: [
      { pumpTimestamp: "2026-09-29T12:00:00Z", insulinDelivered: 4.3, carbsInput: 65 },
      { timestamp: "2026-09-29T09:00:00Z", insulinDelivered: 1.5, carbsInput: 0 },
      { timestamp: "2026-09-29T10:00:00Z", insulinDelivered: 0 },
    ] },
    basalRaw: { scheduledBasals: [{ timestamp: "2026-09-29T00:00:00Z", rate: 0.9 }] },
  });
  assert.deepEqual(r.readings.map((x) => x.mmol), [7, 7]);
  assert.equal(r.boluses.length, 2);
  assert.equal(r.boluses[0].units, 1.5);
  assert.equal(r.boluses[0].carbs, null);
  assert.equal(r.boluses[1].carbs, 65);
  assert.deepEqual(r.basals, [{ time: "2026-09-29T00:00:00.000Z", rate: 0.9 }]);
});
