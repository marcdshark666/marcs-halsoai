#!/usr/bin/env node
// npm run google-login — engångsinloggning mot Google Photos Picker API.
// Öppnar webbläsaren, Marc godkänner, koden landar på http://localhost:5246/
// och byts mot en refresh-token som sparas i %APPDATA%\marcs-halsoai\google.json
// (utanför projektet). Client-secret matas in dolt. Inget skrivs ut.
//
// Fungerar med både "Skrivbordsapp"- och "Webbapplikation"-klienter. För en
// webbklient MÅSTE exakt denna omdirigerings-URI vara registrerad i Google
// Cloud Console:  http://localhost:5246/oauth2callback
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { GOOGLE_FILE, readJsonSafe, writeJsonPrivate, ask, askHidden } from "./glukos/config.mjs";
import { SCOPE } from "./glukos/photos.mjs";

export const PORT = 5246;
export const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

function openBrowser(url) {
  try {
    spawn("cmd.exe", ["/c", "start", "", url.replace(/&/g, "^&")], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch { /* skriv ut länken i stället */ }
}

function waitForCode(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://localhost:${PORT}`);
      if (u.pathname !== "/oauth2callback") { res.writeHead(404); res.end(); return; }
      const err = u.searchParams.get("error");
      const code = u.searchParams.get("code");
      const state = u.searchParams.get("state");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (err || !code || state !== expectedState) {
        res.end("<h2>Inloggningen misslyckades</h2><p>Stäng fliken och kör npm run google-login igen.</p>");
        server.close();
        reject(new Error(`Google svarade: ${err || "ogiltig kod/state"}`));
        return;
      }
      res.end("<h2>Klart – Marcs HälsoAI är kopplad till Google Foto.</h2><p>Du kan stänga fliken.</p>");
      server.close();
      resolve(code);
    });
    server.on("error", (e) => reject(new Error(`Port ${PORT} upptagen? ${e.message}`)));
    server.listen(PORT, "127.0.0.1");
    setTimeout(() => { server.close(); reject(new Error("Ingen inloggning inom 10 minuter")); }, 10 * 60 * 1000).unref();
  });
}

async function main() {
  const existing = readJsonSafe(GOOGLE_FILE, {});
  console.log("Google Foto (Picker API) – engångsinloggning.");
  console.log("Klient-ID och klienthemlighet kommer från console.cloud.google.com → APIs & Services → Credentials (se README).\n");
  const client_id = await ask(`Client ID${existing.client_id ? ` [${existing.client_id.slice(0, 14)}…]` : ""}: `, { fallback: existing.client_id || "" });
  if (!client_id) throw new Error("Inget Client ID.");
  const client_secret = (await askHidden("Client secret (visas inte, Enter = behåll/ingen): ")) || existing.client_secret || "";

  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id, redirect_uri: REDIRECT_URI, response_type: "code", scope: SCOPE,
    access_type: "offline", prompt: "consent", code_challenge: challenge, code_challenge_method: "S256", state,
  });

  console.log("\nÖppnar webbläsaren. Om inget händer, klistra in länken själv:\n" + authUrl + "\n");
  const codePromise = waitForCode(state);
  openBrowser(authUrl);
  const code = await codePromise;

  const body = new URLSearchParams({ code, client_id, redirect_uri: REDIRECT_URI, grant_type: "authorization_code", code_verifier: verifier });
  if (client_secret) body.set("client_secret", client_secret);
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.refresh_token) {
    throw new Error(`Tokenbytet misslyckades (${res.status} ${data.error || ""}: ${data.error_description || "ingen refresh_token – kontrollera att klienttypen och omdirigerings-URI:n stämmer"})`);
  }
  writeJsonPrivate(GOOGLE_FILE, { client_id, client_secret, refresh_token: data.refresh_token, scope: SCOPE, sparad: new Date().toISOString() });
  console.log(`\nKlart. Refresh-token sparad i ${GOOGLE_FILE} (visas inte).`);
  console.log("Testa: npm run glukos -- --bara-bilder --utan-deploy");
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
