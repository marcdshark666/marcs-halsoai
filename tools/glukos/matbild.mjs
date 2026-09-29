// Matigenkänning: bild → livsmedel + uppskattade kolhydrater.
//
// Väg 1 (Marcs godkända gratisväg, samma som Sugar Buddy): Gemini med hans
// egen GEMINI_API_KEY (läses ur %APPDATA%\marcs-halsoai\gemini.json, aldrig
// utskriven). Modellstegen, thinkingLevel low och JSON-läget är kopierade från
// sugar-buddy-bot/api/_utils.js callGemini – rör dem inte utan att mäta.
// Väg 2 (reserv): lokala `claude -p` (terminal/CLI, prenumeration – aldrig API).
//
// SÄKERHETSREGEL (samma som Sugar Buddy): modellen får aldrig nämna insulin,
// enheter eller doser. Prompten förbjuder det och stripDoseTalk() filtrerar
// svaret efteråt. Kolhydraterna är en uppskattning – inget räknas vidare på dem.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { GEMINI_FILE, readJsonSafe } from "./config.mjs";
import { stripDoseTalk } from "../../src/lib/glukos/meals.js";

// Från Sugar Buddys VoiceCarbQuery.jsx (SOURCE_HINT + CARB_SCHEMA), anpassat.
const SOURCE_HINT =
  " Basera kolhydratvärdena FRÄMST på FatSecrets livsmedelsdatabas (fatsecret.se), i andra hand ileweglowodany.pl för polska/europeiska livsmedel." +
  " Skilj ALLTID på tillagning: kokt, rå eller stekt vikt ger helt olika kolhydrater per gram (t.ex. ris/pasta väger ~3x mer kokt)." +
  " Om inget annat framgår, anta KOKT/serverad vikt och säg det. Ange värden per uppskattad portion (inte per 100 g), och uppskatta portionens vikt i gram." +
  " Använd tallrik/bestick som storleksreferens och läs förpackningsetiketter om de syns.";

const SAFETY_RULE =
  " Viktigt: Nämn ALDRIG insulin, insulinenheter, bolus eller doser i något fält – beskriv bara maten och kolhydraterna.";

export const CARB_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          carbs_grams: { type: "number" },
          state: { type: "string", description: "tillagning: kokt / rå / stekt / bakad / okänt" },
          portion: { type: "string", description: "portionsbeskrivning, t.ex. '1 tallrik ~250 g'" },
          portion_grams: { type: "number" },
        },
        required: ["name", "carbs_grams"],
      },
    },
    confidence: { type: "string", description: "låg / medel / hög" },
    comment: { type: "string", description: "kort kommentar om osäkerhet, max 2 meningar, på svenska" },
  },
  required: ["items"],
};

export function buildPrompt() {
  return (
    "Du är en svensk dietist. Identifiera varje livsmedel på bilden (en post per komponent: bröd, ris, kött, sås osv) " +
    "och uppskatta kolhydraterna i gram per portion." + SOURCE_HINT + SAFETY_RULE +
    `\n\nSvara ENDAST med giltig JSON som följer detta schema (ingen extra text, inga kodblock):\n${JSON.stringify(CARB_SCHEMA)}`
  );
}

export function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
  return JSON.parse(candidate);
}

// ---- Gemini (kopia av callGemini i sugar-buddy-bot/api/_utils.js) ----------
async function callGemini({ prompt, image, maxTokens = 2000 }) {
  const key = process.env.GEMINI_API_KEY || readJsonSafe(GEMINI_FILE, {}).api_key;
  if (!key) return null;
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL]
    : ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-2.0-flash"];
  const parts = [{ inline_data: { mime_type: image.mime, data: image.data } }, { text: prompt }];
  const gen = (medThinking) => JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      ...(medThinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
    },
  });
  let lastErr = "okänt fel";
  for (const model of models) {
    for (const medThinking of [true, false]) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: gen(medThinking),
      });
      if (r.ok) {
        const data = await r.json();
        const text = ((data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("")).trim();
        if (text) return { text, provider: `gemini:${model}` };
        lastErr = `${model}: tomt svar`;
        break;
      }
      lastErr = `${model} ${r.status}`;
      if (r.status !== 400) break;
    }
    const status = Number((lastErr.match(/\d+$/) || [])[0]);
    if (status && status !== 429 && status !== 404 && status !== 400) break;
  }
  throw new Error(`Gemini ${lastErr}`);
}

// ---- claude -p (reserv) -----------------------------------------------------
function runClaude(args, { timeoutMs = 180_000 } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE; // tillåt start från en Claude Code-session
    const child = spawn("claude", args, { shell: true, env, windowsHide: true });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("claude -p tog för lång tid")); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !out) return reject(new Error(`claude -p slutkod ${code}: ${err.slice(0, 300)}`));
      resolve(out);
    });
  });
}

async function callClaudeCli({ prompt, imagePath }) {
  const full = `Läs bilden ${imagePath} med Read-verktyget. ${prompt}`;
  const args = ["-p", JSON.stringify(full), "--output-format", "json", "--allowedTools", "Read", "--max-turns", "4"];
  if (process.env.GLUKOS_CLAUDE_MODEL) args.push("--model", process.env.GLUKOS_CLAUDE_MODEL);
  const raw = await runClaude(args);
  let result = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.is_error) throw new Error(`claude -p: ${String(parsed.result).slice(0, 200)}`);
    result = parsed.result;
  } catch (e) {
    if (/claude -p:/.test(e.message)) throw e;
  }
  return { text: result, provider: "claude-cli" };
}

function normalize(parsed, provider) {
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const foods = items
    .filter((it) => it && typeof it.name === "string")
    .map((it) => ({
      namn: stripDoseTalk(it.name).slice(0, 80) || "okänt",
      tillagning: stripDoseTalk(it.state || "okänt").slice(0, 30) || "okänt",
      portion: stripDoseTalk(it.portion || (it.portion_grams ? `~${Math.round(it.portion_grams)} g` : "")).slice(0, 60),
      portion_g: Number.isFinite(Number(it.portion_grams)) ? Math.round(Number(it.portion_grams)) : null,
      kolhydrater_g: Math.max(0, Math.round(Number(it.carbs_grams) || 0)),
    }));
  const carbs_g = foods.reduce((a, f) => a + f.kolhydrater_g, 0);
  return {
    foods,
    carbs_g,
    confidence: ["låg", "medel", "hög"].includes(parsed.confidence) ? parsed.confidence : "medel",
    comment: stripDoseTalk(parsed.comment || "").slice(0, 300),
    source: provider,
  };
}

/**
 * Analyserar en matbild. Gemini först (gratis, Marcs nyckel), annars claude -p.
 * Returnerar { foods, carbs_g, confidence, comment, source } eller kastar.
 */
export async function analyzeFood(imagePath, { log = () => {} } = {}) {
  const prompt = buildPrompt();
  const data = fs.readFileSync(imagePath).toString("base64");
  const mime = /\.png$/i.test(imagePath) ? "image/png" : "image/jpeg";
  const errors = [];
  try {
    const g = await callGemini({ prompt, image: { mime, data } });
    if (g) return normalize(extractJson(g.text), g.provider);
    errors.push("gemini: ingen nyckel");
  } catch (e) {
    errors.push(e.message);
    log(`Gemini misslyckades (${e.message}) – provar claude -p`);
  }
  try {
    const c = await callClaudeCli({ prompt, imagePath });
    return normalize(extractJson(c.text), c.provider);
  } catch (e) {
    errors.push(e.message);
  }
  throw new Error(`Matigenkänningen misslyckades: ${errors.join("; ")}`);
}
