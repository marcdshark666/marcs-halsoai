#!/usr/bin/env node
// npm run set-gemini — (frivilligt) lägger Marcs GRATIS Gemini-nyckel i
// %APPDATA%\marcs-halsoai\gemini.json så matigenkänningen går samma gratisväg
// som Sugar Buddy. Utan nyckel används lokala `claude -p` i stället.
// Nyckeln matas in dolt och skrivs aldrig ut. Gemini-gratisnivån kostar inget –
// aktivera aldrig fakturering i Google Cloud för den här nyckeln.
import { GEMINI_FILE, writeJsonPrivate, askHidden } from "./glukos/config.mjs";

async function main() {
  console.log("Gemini-nyckel för matigenkänningen (samma nyckel som Sugar Buddy använder går bra).");
  console.log("Ny gratis nyckel: aistudio.google.com/apikey – inget kort, ingen fakturering.\n");
  if (!process.stdin.isTTY) console.log("(Obs: ingen riktig konsol – nyckeln kan synas när du skriver.)");
  const key = await askHidden("GEMINI_API_KEY (visas inte): ");
  if (!key || key.length < 20) throw new Error("Nyckeln ser inte giltig ut.");
  writeJsonPrivate(GEMINI_FILE, { api_key: key, sparad: new Date().toISOString() });
  console.log(`Sparad i ${GEMINI_FILE} (${key.length} tecken, visas inte).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
