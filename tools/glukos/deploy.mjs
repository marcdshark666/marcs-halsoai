// Bygg + deploy av sajten. Vercel-CLI:t hittar inloggningen bara när
// XDG_DATA_HOME pekar på %APPDATA%\xdg.data (minnesanteckning
// vercel-cli-saknar-inloggning) – sätts här om den saknas. Ett första
// "Not authorized" kan lyckas vid omförsök, därför två försök.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PROJECT_ROOT } from "./config.mjs";

const CLIENT_FILE = path.join(PROJECT_ROOT, "src", "api", "base44Client.js");

/** Höjer SEED_VERSION så återvändande besökare får den nya realdatan. */
export function bumpSeedVersion(tag) {
  const src = fs.readFileSync(CLIENT_FILE, "utf8");
  const re = /const SEED_VERSION = "([^"]*)";/;
  if (!re.test(src)) throw new Error("Hittar inte SEED_VERSION i base44Client.js");
  const next = `marc-${tag}-glukos`;
  const out = src.replace(re, `const SEED_VERSION = "${next}";`);
  if (out !== src) fs.writeFileSync(CLIENT_FILE, out, "utf8");
  return next;
}

function vercelEnv() {
  const env = { ...process.env };
  if (!env.XDG_DATA_HOME) {
    const candidates = [
      path.join(env.APPDATA || "", "xdg.data"),
      path.join(env.LOCALAPPDATA || "", "xdg.data"),
    ];
    const hit = candidates.find((c) => fs.existsSync(path.join(c, "com.vercel.cli", "auth.json")));
    if (hit) env.XDG_DATA_HOME = hit;
  }
  return env;
}

function run(cmd, args, { env, log }) {
  const r = spawnSync(cmd, args, { cwd: PROJECT_ROOT, encoding: "utf8", env, shell: true, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
  if (log) for (const line of out.split(/\r?\n/).slice(-15)) if (line.trim()) log(`  ${line.trim()}`);
  return { code: r.status, out };
}

export function build({ log = () => {} } = {}) {
  log("Bygger sajten (npm run build)…");
  const r = run("npm", ["run", "build"], { env: process.env, log });
  if (r.code !== 0) throw new Error("npm run build misslyckades");
}

export function deploy({ log = () => {} } = {}) {
  const env = vercelEnv();
  if (!env.XDG_DATA_HOME) log("VARNING: hittar ingen Vercel-inloggning under xdg.data – deployen kan svara 'No existing credentials'.");
  for (let attempt = 1; attempt <= 2; attempt++) {
    log(`Deployar till Vercel (försök ${attempt})…`);
    const r = run("npx", ["--yes", "vercel", "--prod", "--yes"], { env, log });
    if (r.code === 0) {
      const url = (r.out.match(/https:\/\/[\w.-]+\.vercel\.app/g) || []).pop();
      return url || "ok";
    }
    if (!/not authorized|credentials|ETIMEDOUT|ECONNRESET/i.test(r.out) || attempt === 2) {
      throw new Error(`vercel --prod misslyckades: ${r.out.split(/\r?\n/).filter(Boolean).slice(-3).join(" | ").slice(0, 300)}`);
    }
  }
  return null;
}
