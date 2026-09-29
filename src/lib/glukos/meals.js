// Måltidsinsikt UTAN insulindata: hur såg blodsockerkurvan ut de 3–4 timmarna
// efter en måltid? Resultatet är ett MÖNSTER att ta upp med diabetesteamet.
//
// FÅR ALDRIG RÖRAS (samma regel som Sugar Buddy): ingen kod här räknar,
// föreslår eller antyder insulinenheter eller doser. Flaggorna beskriver
// kurvans form – inte vad Marc borde ha gjort.

const MIN = 60 * 1000;
export const LOW_MMOL = 3.9;
export const HIGH_2H_MMOL = 10.0;
export const RISE_3H_MMOL = 3.0;
export const RISING_STEP_MMOL = 0.3; // stigning över 20 min som räknas som "stiger fortfarande"
export const FOLLOWUP_MIN = 240;
export const HORIZON_MIN = 180;

export const FLAG_TEXT = {
  for_lite: "Möjligen för lite insulin eller sent bolus",
  for_mycket: "Möjligen för mycket insulin",
};

const round1 = (v) => Math.round(v * 10) / 10;

/** Närmaste mätning inom ±toleranceMin, annars null. Binärsökning på stigande serie. */
export function nearest(series, t, toleranceMin = 15) {
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

export function inWindow(series, from, to) {
  return series.filter((p) => p.t > from && p.t <= to);
}

/**
 * @param {Array<{t:number, mmol:number}>} series  stigande CGM-serie som täcker måltiden
 * @param {number} t0  måltidens tid (ms)
 * @param {{ nextMealAt?: number|null }} opts  nästa måltids tid – stör tolkningen
 */
export function mealInsight(series, t0, { nextMealAt = null } = {}) {
  const s = (series || []).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.mmol));
  const lastT = s.length ? s[s.length - 1].t : null;
  const baselineP = nearest(s, t0, 15);
  const baseline = baselineP ? baselineP.mmol : null;

  const curve = s
    .filter((p) => p.t >= t0 - 15 * MIN && p.t <= t0 + FOLLOWUP_MIN * MIN)
    .map((p) => ({ min: Math.round((p.t - t0) / MIN), mmol: p.mmol }));

  const horizon = inWindow(s, t0, t0 + HORIZON_MIN * MIN);
  let peak = null, peakMin = null;
  for (const p of horizon) {
    if (peak == null || p.mmol > peak) { peak = p.mmol; peakMin = Math.round((p.t - t0) / MIN); }
  }
  const rise = peak != null && baseline != null ? round1(peak - baseline) : null;

  const at2hP = nearest(s, t0 + 120 * MIN, 15);
  const at3hP = nearest(s, t0 + 180 * MIN, 15);
  const before2hP = nearest(s, t0 + 100 * MIN, 15);
  const at2h = at2hP ? at2hP.mmol : null;
  const at3h = at3hP ? at3hP.mmol : null;
  const rising2h = at2h != null && before2hP != null && at2h - before2hP.mmol >= RISING_STEP_MMOL;

  const followup = inWindow(s, t0, t0 + FOLLOWUP_MIN * MIN);
  const nadir = followup.length ? Math.min(...followup.map((p) => p.mmol)) : null;
  const hypoWithin4h = nadir != null && nadir < LOW_MMOL;

  const complete = lastT != null && lastT >= t0 + FOLLOWUP_MIN * MIN - 10 * MIN;
  const stord = nextMealAt != null && nextMealAt > t0 && nextMealAt <= t0 + HORIZON_MIN * MIN;

  const flags = [];
  if ((at2h != null && at2h > HIGH_2H_MMOL && rising2h) || (at3h != null && baseline != null && at3h > baseline + RISE_3H_MMOL)) {
    flags.push("for_lite");
  }
  if (hypoWithin4h) flags.push("for_mycket");

  return {
    baseline, peak, peakMin, rise, at2h, at3h, rising2h, nadir, hypoWithin4h,
    flags, stord, complete, curve,
    text: insightText({ baseline, peak, rise, at2h, at3h, rising2h, nadir, hypoWithin4h, flags, stord, complete }),
  };
}

/** Svensk beskrivning av mönstret. Nämner aldrig enheter eller doser. */
export function insightText(i) {
  if (i.baseline == null) return "Ingen CGM-mätning nära måltiden – kurvan går inte att bedöma.";
  const bit = [];
  bit.push(`Start ${fmt(i.baseline)}`);
  if (i.peak != null) bit.push(`topp ${fmt(i.peak)} (+${fmt(i.rise)})`);
  if (i.at2h != null) bit.push(`efter 2 h ${fmt(i.at2h)}${i.rising2h ? " och stigande" : ""}`);
  if (i.at3h != null) bit.push(`efter 3 h ${fmt(i.at3h)}`);
  if (i.hypoWithin4h) bit.push(`lägst ${fmt(i.nadir)} inom 4 h`);
  let s = bit.join(", ") + " mmol/L.";
  if (i.flags.includes("for_lite") && i.flags.includes("for_mycket")) {
    s += " Både en hög topp och ett lågt värde efteråt – ett mönster att ta upp med diabetesteamet.";
  } else if (i.flags.includes("for_lite")) {
    s += " Kurvan ligger kvar högt – möjligen för lite insulin eller sent bolus. Ta upp mönstret med diabetesteamet.";
  } else if (i.flags.includes("for_mycket")) {
    s += " Ett lågt värde inom 4 h – möjligen för mycket insulin. Ta upp mönstret med diabetesteamet.";
  } else if (i.complete) {
    s += " Kurvan höll sig inom det förväntade.";
  }
  if (i.stord) s += " Ny måltid inom 3 h – kurvan kan inte tolkas ensam.";
  if (!i.complete) s += " Preliminärt: kurvan är inte färdig ännu.";
  return s;
}

const fmt = (v) => (v == null ? "–" : String(round1(v)).replace(".", ","));

/**
 * Säkerhetsfilter för text som kommer från en språkmodell (matigenkänning):
 * plockar bort varje formulering som anger insulinenheter/doser.
 */
export function stripDoseTalk(text) {
  if (!text) return "";
  return String(text)
    .replace(/[^.!?\n]*\b\d+([.,]\d+)?\s*(E|IE|IU|U|enheter|enhet|units?)\b[^.!?\n]*[.!?]?/gi, "")
    .replace(/[^.!?\n]*\b(insulin|bolus|dos|dosera|doserar|dosen|doser)\w*[^.!?\n]*[.!?]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
