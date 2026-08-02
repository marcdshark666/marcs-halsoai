// Tolkar en svensk röstinspelning/fritext till ett åtgärdsförslag.
// Transkriptet bevaras ALLTID ordagrant i beskrivningen – tolkningen styr
// bara förifyllda fält (datum, typ, prioritet) som användaren kan ändra.
import { addDays, addWeeks, addMonths, format } from "date-fns";

const WORD_NUMBERS = {
  en: 1, ett: 1, två: 2, tva: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7,
  åtta: 8, atta: 8, nio: 9, tio: 10, elva: 11, tolv: 12, fjorton: 14, tjugo: 20,
};

const MONTHS = {
  januari: 0, februari: 1, mars: 2, april: 3, maj: 4, juni: 5,
  juli: 6, augusti: 7, september: 8, oktober: 9, november: 10, december: 11,
};

const WEEKDAYS = { måndag: 1, tisdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lördag: 6, söndag: 0 };

function num(word) {
  const n = parseInt(word, 10);
  if (!Number.isNaN(n)) return n;
  return WORD_NUMBERS[word] ?? null;
}

// Hittar datum i text: "idag", "imorgon", "om (cirka) en vecka", "om 3 dagar",
// "om en månad", "nästa vecka", "på fredag", "den 15 juli" / "15 juli".
export function parseDueDate(text, today = new Date()) {
  const t = text.toLowerCase();

  if (/\bi ?dag\b/.test(t)) return today;
  if (/\bi ?över ?morgon\b/.test(t)) return addDays(today, 2);
  if (/\bi ?morgon\b/.test(t)) return addDays(today, 1);
  if (/\bnästa vecka\b/.test(t)) return addWeeks(today, 1);
  if (/\bnästa månad\b/.test(t)) return addMonths(today, 1);

  let m = t.match(/\bom\s+(?:cirka\s+|ca\s+|ungefär\s+)?(\w+)\s+(dag(?:ar)?|veck(?:a|or)|månad(?:er)?)\b/);
  if (m) {
    const n = num(m[1]) ?? 1;
    if (m[2].startsWith("dag")) return addDays(today, n);
    if (m[2].startsWith("veck")) return addWeeks(today, n);
    return addMonths(today, n);
  }

  m = t.match(/\b(?:på\s+)?(måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag)\b/);
  if (m) {
    const target = WEEKDAYS[m[1]];
    const diff = (target - today.getDay() + 7) % 7 || 7;
    return addDays(today, diff);
  }

  m = t.match(/\b(?:den\s+)?(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\b/);
  if (m) {
    const d = new Date(today.getFullYear(), MONTHS[m[2]], parseInt(m[1], 10));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  return addWeeks(today, 1); // standard: om en vecka
}

const TYPE_KEYWORDS = [
  { type: "blodprov", words: ["blodprov", "prover", "provtagning", "labb", "tsh", "kalium", "kreatinin", "hba1c", "ldl", "ferritin"] },
  { type: "undersökning", words: ["eko", "ekokardiografi", "röntgen", "undersökning", "mr ", "magnetkamera", "dt ", "ct ", "pet", "venografi", "ultraljud", "holter", "scint", "ekg", "ögonbotten", "spirometri"] },
  { type: "remiss", words: ["remiss", "omkoordinera", "koordinera", "skicka till", "hänvisa"] },
  { type: "recept", words: ["recept", "förnya", "medicin", "apotek", "dos"] },
  { type: "besök", words: ["besök", "läkartid", "träffa", "mottagning", "återbesök", "kontroll hos"] },
];

export function parseType(text) {
  const t = " " + text.toLowerCase() + " ";
  for (const { type, words } of TYPE_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return type;
  }
  return "besök";
}

export function parsePriority(text) {
  const t = text.toLowerCase();
  if (/\bakut|omgående|genast|direkt\b/.test(t)) return "akut";
  if (/\bviktigt|hög prioritet|snarast|prioritera\b/.test(t)) return "hög";
  if (/\blåg prioritet|någon gång|när det passar\b/.test(t)) return "låg";
  return "medel";
}

// Plats: "till/på/hos <Plats>" – t.ex. "till Sollentuna fysiologi".
export function parseLocation(text) {
  const m = text.match(/\b(?:till|på|hos)\s+([A-ZÅÄÖ][\wåäöÅÄÖ-]*(?:\s+[a-zåäöA-ZÅÄÖ][\wåäöÅÄÖ-]*){0,3})/);
  return m ? m[1].trim() : "";
}

// Rubrik: transkriptet rensat från kommandofraser och datumfraser, max ~70 tecken.
export function parseTitle(text) {
  let s = text.trim()
    .replace(/^(lägg till|påminn mig om att|påminn mig om|påminn om|boka|skapa|ny åtgärd:?|jag vill)\s+/i, "")
    .replace(/\bom\s+(?:cirka\s+|ca\s+|ungefär\s+)?\w+\s+(dagar?|veck(?:a|or)|månad(?:er)?)\b/gi, "")
    .replace(/\b(i ?dag|i ?morgon|i ?över ?morgon|nästa vecka|nästa månad)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "");
  if (!s) s = text.trim();
  if (s.length > 70) {
    s = s.slice(0, 70);
    const lastSpace = s.lastIndexOf(" ");
    if (lastSpace > 40) s = s.slice(0, lastSpace);
    s += "…";
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseSpokenAction(transcript, today = new Date()) {
  return {
    title: parseTitle(transcript),
    due_date: format(parseDueDate(transcript, today), "yyyy-MM-dd"),
    type: parseType(transcript),
    priority: parsePriority(transcript),
    location: parseLocation(transcript),
    // Ordagrann återgivning – får aldrig sammanfattas eller skrivas om.
    description: `Röstanteckning (ordagrant): "${transcript.trim()}"`,
  };
}
