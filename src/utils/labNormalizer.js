// Normaliserar labbtestnamn så att "S-Kalium" och "Kalium" grupperas tillsammans.
const PREFIXES = /^(\(B\)Erc-|Erc\(B\)-|fS-|fP-|Pt-|\(B\)|S-|B-|P-)/i;

const VARIANT_MAP = {
  "hemoglobin": "Hb",
  "hb": "Hb",
  "ldl kolesterol": "LDL",
  "ldl-kolesterol": "LDL",
  "ldl": "LDL",
  "hdl-kolesterol": "HDL",
  "hdl kolesterol": "HDL",
  "hdl": "HDL",
  "non-hdl-kolesterol": "non-HDL",
  "non-hdl": "non-HDL",
  "egfr(krea) relativ": "eGFR",
  "egfr(krea)relativ": "eGFR",
  "egfr(krea)": "eGFR",
  "alkalisk fosfatas": "ALP",
  "alp, alkalisk fosfatas": "ALP",
  "alp": "ALP",
  "gamma-gt": "gamma-GT",
  "t4 fritt": "T4 fritt",
  "t4 (tyroxin)": "T4",
  "t4": "T4",
  "p-glukos": "P-Glukos",
  "glukos": "P-Glukos",
  "kobalamin, b12": "B12",
  "kobalamin": "B12",
  "b12": "B12",
  "hba1c (ifcc)": "HbA1c",
  "hba1c": "HbA1c",
  "triglycerid": "Triglycerider",
  "triglycerider": "Triglycerider",
  "tyreotropin (tsh)": "TSH",
  "tyreotropin": "TSH",
  "tyroxin, fri(ft4)": "T4 fritt",
  "tyroxin, fri": "T4 fritt",
  "tyroxin": "T4",
  "gt": "gamma-GT",
  "calcium": "Kalcium",
  "egfr(krea) rel.": "eGFR",
  "c-peptid": "C-Peptid",
  "kortisol": "Kortisol",
  "urat": "Urat",
  "natrium": "Natrium",
  "kalium": "Kalium",
  "erytrocyter": "Erytrocyter",
  "evf": "EVF",
  "gad-ak (igg)": "GAD-ak",
  "gad-ak": "GAD-ak",
  "albumin/krea kvot": "Albumin/Krea kvot",
  "totalkolesterol": "Kolesterol",
  "kolesterol": "Kolesterol",
};

export function normalizeTestName(name) {
  if (!name) return name;
  let n = name.trim();
  n = n.replace(PREFIXES, "").trim();
  const lower = n.toLowerCase();
  if (VARIANT_MAP[lower]) return VARIANT_MAP[lower];
  return n;
}

// Formaterar referensintervall korrekt även när bara en gräns finns:
// (låg, hög) → "3.5–8.8", (null, hög) → "≤ 5", (låg, null) → "≥ 60".
export function formatRef(low, high) {
  const hasLow = low != null && low !== "";
  const hasHigh = high != null && high !== "";
  if (hasLow && hasHigh) return `${low}–${high}`;
  if (hasHigh) return `≤ ${high}`;
  if (hasLow) return `≥ ${low}`;
  return "–";
}