// Var hemligheterna bor och hur de läses. ALLT ligger utanför projektmappen
// (%APPDATA%\marcs-halsoai\) så inget kan följa med i dist/ eller git.
// Ingen funktion här skriver ut ett lösenord, en nyckel eller en token.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONFIG_DIR = process.env.MARCS_HALSOAI_CONFIG
  || path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || ".", "AppData", "Roaming"), "marcs-halsoai");

export const DEXCOM_FILE = path.join(CONFIG_DIR, "dexcom.json");
export const GOOGLE_FILE = path.join(CONFIG_DIR, "google.json");
export const GEMINI_FILE = path.join(CONFIG_DIR, "gemini.json");

export function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  return CONFIG_DIR;
}

export function readJsonSafe(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonPrivate(file, data) {
  ensureConfigDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
}

/** Vanlig synlig fråga. */
export function ask(question, { fallback = "" } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || "").trim() || fallback);
    });
  });
}

/**
 * Dold inmatning: tecknen ekas inte. Fungerar i en riktig konsol (TTY).
 * Utan TTY (t.ex. pipe) läses en rad rakt av – varna i så fall i anroparen.
 */
export function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    if (!stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin, terminal: false });
      rl.once("line", (line) => { rl.close(); process.stdout.write("\n"); resolve(line.trim()); });
      return;
    }
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (ch === "\u0003") { // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\n");
          reject(new Error("Avbrutet"));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

/** Loggrad med tidsstämpel till konsol + fil (aldrig hemligheter). */
export function makeLogger(logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  return (msg) => {
    const line = `${new Date().toISOString()} ${msg}`;
    console.log(line);
    try { fs.appendFileSync(logFile, line + "\n"); } catch { /* loggfilen är inte kritisk */ }
  };
}
