// Lokalt datalager med samma API-yta som Base44-SDK:n
// (entities.list/create/update/delete, auth.*, integrations.Core.InvokeLLM).
// Allt lagras i localStorage och seedas från realdata/*.json vid första start.

// Marcs data. Journal, provsvar och mediciner är ännu inte inlästa – de
// filerna är tomma. UpcomingAction.json innehåller utredningsplanen.
import realLabResults from "./realdata/LabResult.json";
import realJournalEntries from "./realdata/JournalEntry.json";
import realUpcomingActions from "./realdata/UpcomingAction.json";
import realMedications from "./realdata/Medication.json";
import realAdverseDrugHistory from "./realdata/AdverseDrugHistory.json";
// Dygnsstatistik + måltider från det nattliga jobbet tools/daglig-glukos.js.
import realGlucoseDays from "./realdata/GlucoseDay.json";
import { seedUser } from "./seedData";

const STORE_PREFIX = "local_base44_";
const SEED_VERSION_KEY = `${STORE_PREFIX}seed_version`;
// Höj den här när realdata/*.json ändras, annars behåller återvändande
// besökare den gamla kopian i localStorage.
const SEED_VERSION = "marc-2026-09-30-dag2c";

let idCounter = Date.now();
const newId = () => `loc_${(idCounter++).toString(36)}`;

function readStore(entityName) {
  try {
    return JSON.parse(localStorage.getItem(STORE_PREFIX + entityName)) || [];
  } catch {
    return [];
  }
}

function writeStore(entityName, rows) {
  localStorage.setItem(STORE_PREFIX + entityName, JSON.stringify(rows));
}

function seedIfNeeded() {
  if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return;
  // Riktiga poster har redan id/created_date från Base44 – används som de är.
  const seeds = {
    LabResult: realLabResults,
    Medication: realMedications,
    JournalEntry: realJournalEntries,
    UpcomingAction: realUpcomingActions,
    AdverseDrugHistory: realAdverseDrugHistory,
    GlucoseDay: realGlucoseDays,
  };
  const now = new Date().toISOString();
  for (const [name, rows] of Object.entries(seeds)) {
    writeStore(name, rows.map((r) => ({ id: newId(), created_date: now, updated_date: now, ...r })));
  }
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

seedIfNeeded();

// Sorterar enligt Base44-konventionen: "field" stigande, "-field" fallande.
function sortRows(rows, sort) {
  if (!sort) return rows;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[field] ?? "";
    const bv = b[field] ?? "";
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function matchesFilter(row, filter) {
  return Object.entries(filter || {}).every(([k, v]) => row[k] === v);
}

function makeEntity(entityName) {
  return {
    async list(sort, limit) {
      let rows = sortRows(readStore(entityName), sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async filter(filter, sort, limit) {
      let rows = readStore(entityName).filter((r) => matchesFilter(r, filter));
      rows = sortRows(rows, sort);
      if (limit) rows = rows.slice(0, limit);
      return rows;
    },
    async get(id) {
      return readStore(entityName).find((r) => r.id === id) || null;
    },
    async create(data) {
      const rows = readStore(entityName);
      const now = new Date().toISOString();
      const row = { id: newId(), created_date: now, updated_date: now, ...data };
      rows.push(row);
      writeStore(entityName, rows);
      return row;
    },
    async bulkCreate(items) {
      const created = [];
      for (const item of items) created.push(await this.create(item));
      return created;
    },
    async update(id, data) {
      const rows = readStore(entityName);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`${entityName} ${id} hittades inte`);
      rows[idx] = { ...rows[idx], ...data, id, updated_date: new Date().toISOString() };
      writeStore(entityName, rows);
      return rows[idx];
    },
    async delete(id) {
      writeStore(entityName, readStore(entityName).filter((r) => r.id !== id));
      return { success: true };
    },
  };
}

const entities = new Proxy({}, {
  get(cache, entityName) {
    if (!cache[entityName]) cache[entityName] = makeEntity(entityName);
    return cache[entityName];
  },
});

// ---------------------------------------------------------------------------
// Lokal "LLM" – heuristisk motor som svarar utan externt API.
// Känner igen de tre anropsmönstren i appen (journalsök, uppföljnings-
// rekommendationer, evidenssök) och bygger svar från prompt-innehållet.
// ---------------------------------------------------------------------------

function extractSection(prompt, header) {
  const re = new RegExp(`${header}:\\s*\\n([\\s\\S]*?)(?=\\n\\n[A-ZÅÄÖ]|$)`);
  const m = prompt.match(re);
  return m ? m[1].trim() : "";
}

function localJournalSearch(prompt) {
  const q = (prompt.match(/FRÅGA:\s*(.+)/)?.[1] || "").trim();
  const labLines = extractSection(prompt, "LABBRESULTAT").split("\n").filter(Boolean);
  const journalLines = extractSection(prompt, "JOURNALANTECKNINGAR").split("\n").filter(Boolean);

  const words = q.toLowerCase().split(/[\s,?.!]+/).filter((w) => w.length > 2);
  const scored = (lines) =>
    lines
      .map((line) => ({ line, score: words.filter((w) => line.toLowerCase().includes(w)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.line);

  const labHits = scored(labLines);
  const journalHits = scored(journalLines);
  const abnormalHits = labHits.filter((l) => !l.includes("status: normal"));

  if (labHits.length === 0 && journalHits.length === 0) {
    return `Jag hittar inget i journaldata eller labbresultat som matchar frågan "${q}". Marcs journal och provsvar är ännu inte inlästa – prova utredningsplanen och evidensbanken längre ner på sidan, eller sök på ett provnamn (t.ex. HbA1c, TSH, IgG) när data finns på plats.`;
  }

  let answer = `Sökresultat för "${q}" (lokal sökning i journaldata)\n\n`;
  if (labHits.length) {
    answer += `LABBRESULTAT\n${labHits.map((l) => `• ${l}`).join("\n")}\n\n`;
  }
  if (abnormalHits.length) {
    answer += `⚠ Avvikande värden: ${abnormalHits.length} av träffarna ligger utanför referensintervallet.\n\n`;
  }
  if (journalHits.length) {
    answer += `JOURNALANTECKNINGAR\n${journalHits.map((l) => `• ${l.slice(0, 220)}${l.length > 220 ? "…" : ""}`).join("\n")}`;
  }
  return answer;
}

function localFollowUpRecommendations() {
  // Bygger rekommendationer från faktiska data i det lokala lagret i stället
  // för en extern modell: labbtrender + öppna åtgärder → förslag.
  const labs = readStore("LabResult");
  const actions = readStore("UpcomingAction").filter((a) => !a.is_completed);
  const existing = new Set(actions.map((a) => a.title.toLowerCase()));

  // Hela serien per prov, kronologiskt – behövs för trendbedömning.
  const seriesByTest = {};
  for (const r of labs) {
    (seriesByTest[r.test_name] ||= []).push(r);
  }
  Object.values(seriesByTest).forEach((s) =>
    s.sort((a, b) => (a.sample_date < b.sample_date ? -1 : 1))
  );

  const series = (needle) =>
    Object.entries(seriesByTest).find(([name]) =>
      name.toLowerCase().includes(needle.toLowerCase())
    )?.[1] || [];
  const latest = (needle) => series(needle).slice(-1)[0];

  const recs = [];
  const push = (rec) => {
    if (![...existing].some((t) => t.includes(rec.title.toLowerCase().slice(0, 12)))) recs.push(rec);
  };

  // Glykemisk kontroll – förklarar viktnedgång via glukosuri
  const hba1c = latest("HbA1c");
  if (hba1c && hba1c.value >= 53) {
    push({
      title: "Justera insulindosen och följ vikten i 6–8 veckor",
      reason: `HbA1c ${hba1c.value} ${hba1c.unit} (${hba1c.sample_date}). Vid otillräcklig insulineffekt överskrids njurtröskeln och kalorier går förlorade i urinen – det ensamt kan förklara viktnedgången.`,
      timeframe: "Nu",
      priority: "hög",
      type: "besök",
      value_assessment: "Den vanligaste och mest åtgärdbara orsaken. Vidare utredning bör tolkas först efter att dosjusteringen fått verka.",
    });
  } else if (!hba1c) {
    push({
      title: "HbA1c saknas helt i materialet",
      reason: "Utan aktuellt HbA1c går det inte att bedöma om viktnedgången beror på glukosuri vid suboptimal diabeteskontroll – prioritet 1 i utredningsplanen.",
      timeframe: "Vid nästa provtagning",
      priority: "hög",
      type: "blodprov",
      value_assessment: "Ett enda prov avgör om resten av utredningen ens behöver drivas vidare.",
    });
  }

  // Celiakiserologi – kräver total-IgA för att vara tolkbar
  const ttg = latest("tTG-IgA");
  const totalIga = latest("IgA");
  if (ttg && !totalIga) {
    push({
      title: "Komplettera med total-IgA",
      reason: `tTG-IgA finns (${ttg.value} ${ttg.unit}, ${ttg.sample_date}) men total-IgA saknas. Vid selektiv IgA-brist – vanligare vid typ 1-diabetes – blir tTG-IgA falskt negativt.`,
      timeframe: "Snarast",
      priority: "hög",
      type: "blodprov",
      value_assessment: "Utan total-IgA går ett negativt tTG-IgA inte att lita på.",
    });
  }

  // Antikroppsdefekt
  const igg = latest("IgG");
  if (igg && igg.status !== "normal") {
    push({
      title: "Remiss till immunolog",
      reason: `IgG ${igg.value} ${igg.unit} (${igg.sample_date}) ligger utanför referensintervallet. Vid recidiverande luftvägsinfektioner ska antikroppsdefekt utredas vidare med vaccinationssvar.`,
      timeframe: "Inom 4 veckor",
      priority: "hög",
      type: "remiss",
      value_assessment: "Diagnosfördröjningen vid CVID är i genomsnitt 6–7 år, och 28 % har bronkiektasier redan vid diagnos. Ange samtidig steroiddos – kortison kan sänka IgG.",
    });
  }

  // Sköldkörtel
  const tsh = latest("TSH");
  if (tsh && tsh.status !== "normal") {
    push({
      title: "Komplettera med fritt T4 och TPO-antikroppar",
      reason: `TSH ${tsh.value} ${tsh.unit} (${tsh.sample_date}) är avvikande. Hypertyreos förklarar viktnedgång trots bibehållen aptit.`,
      timeframe: "Snarast",
      priority: "hög",
      type: "blodprov",
      value_assessment: "Autoimmun tyreoideasjukdom förekommer hos 15–30 % vid typ 1-diabetes.",
    });
  }

  // Näringsstatus som stöd för malabsorption
  const naring = ["Ferritin", "Vitamin B12", "Folat", "25-OH-vitamin D"]
    .map((n) => latest(n))
    .filter((r) => r && r.status === "low");
  if (naring.length >= 2) {
    push({
      title: "Malabsorptionsmönster i näringsstatus",
      reason: `Flera näringsmarkörer är låga: ${naring.map((r) => `${r.test_name} ${r.value} ${r.unit}`).join(", ")}. Mönstret talar för upptagsstörning snarare än otillräckligt intag.`,
      timeframe: "Nu",
      priority: "hög",
      type: "besök",
      value_assessment: "Stärker celiakimisstanken oavsett hur serologin utföll och motiverar gastroskopi med biopsi vid fortsatt oklarhet.",
    });
  }

  // Malignitetsspår vid avvikande basscreening
  const basAvvikande = ["Leukocyter", "Hb", "CRP", "SR", "LD", "Albumin"]
    .map((n) => latest(n))
    .filter((r) => r && r.status !== "normal");
  if (basAvvikande.length >= 2) {
    push({
      title: "Utvidga med bilddiagnostik",
      reason: `Flera avvikelser i basscreeningen: ${basAvvikande.map((r) => `${r.test_name} ${r.value} ${r.unit}`).join(", ")}. Vid viktnedgång med avvikande blodstatus ska bilddiagnostik inte invänta övriga svar.`,
      timeframe: "Inom 2 veckor",
      priority: "hög",
      type: "undersökning",
      value_assessment: "Basutredningen är det som ska styra – svepande bilddiagnostik utan avvikelser ger lite.",
    });
  }

  return { recommendations: recs.slice(0, 6) };
}

function localEvidenceAnswer(prompt) {
  const q = (prompt.match(/FRÅGA:\s*"([^"]+)"/)?.[1] || "din fråga").trim();
  // Plocka referensnummer ur kontexten så svaret pekar på verkliga källor
  const refNumbers = [...prompt.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
  const picked = refNumbers.slice(0, 3);

  return {
    sammanfattning: `Detta är ett lokalt genererat svar utan extern AI-modell. För frågan "${q}" gäller generellt: följ etablerade riktlinjer (ADA Standards of Care, svenska nationella riktlinjer) och diskutera alltid individuella beslut med behandlande läkare. Referenserna nedan innehåller den evidens som är mest relevant för frågan.`,
    praktiska_overvaganden: [
      "Svaret bygger på lokal heuristik – koppla en riktig LLM-tjänst för fullständig syntes.",
      "Vid typ 1-diabetes ska glykemisk kontroll uteslutas som orsak till viktnedgång innan andra spår drivs.",
      "Celiakiserologi kräver total-IgA i samma prov och pågående glutenintag för att vara tolkbar.",
    ],
    slutsats: "Granska de markerade referenserna och ta upp frågan vid nästa läkarbesök för individuell bedömning.",
    relevanta_referenser: picked,
    uppfoljningsfraga: "Vilka kontroller behövs inför nästa uppföljning?",
  };
}

async function InvokeLLM({ prompt = "", response_json_schema } = {}) {
  // Simulerad svarstid så laddningsindikatorer syns
  await new Promise((r) => setTimeout(r, 400));

  if (response_json_schema?.properties?.recommendations) {
    return localFollowUpRecommendations();
  }
  if (response_json_schema?.properties?.sammanfattning) {
    return localEvidenceAnswer(prompt);
  }
  return localJournalSearch(prompt);
}

// ---------------------------------------------------------------------------
// Lokal auth – alltid inloggad som demoanvändaren.
// ---------------------------------------------------------------------------

const auth = {
  async me() {
    return { ...seedUser };
  },
  async loginViaEmailPassword() {
    return { user: { ...seedUser } };
  },
  async loginWithProvider() {
    window.location.href = "/";
  },
  async register() {
    return { user: { ...seedUser } };
  },
  async verifyOtp() {
    return { token: "local-token" };
  },
  async resendOtp() {
    return { success: true };
  },
  async resetPasswordRequest() {
    return { success: true };
  },
  async resetPassword() {
    return { success: true };
  },
  setToken() {},
  logout() {},
  redirectToLogin() {
    window.location.href = "/login";
  },
};

export const base44 = {
  entities,
  auth,
  integrations: {
    Core: { InvokeLLM },
  },
};
