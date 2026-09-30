#!/usr/bin/env node
// npm run set-glooko — Marc skriver in sina Glooko-uppgifter SJÄLV.
// Lösenordet ekas inte och sparas i %APPDATA%\marcs-halsoai\glooko.json
// (utanför projektet, aldrig i git eller dist). Ingen AI-session ska någonsin
// köra det här åt honom eller skriva lösenordet.
import { GLOOKO_FILE, DEXCOM_FILE, readJsonSafe, writeJsonPrivate, ask, askHidden } from "./glukos/config.mjs";
import { fetchGlooko } from "./glukos/glooko.mjs";

// Marcs användarnamn (inte hemligt; bara förifyllt i den lokala prompten, aldrig på sidan).
const DEFAULT_USERNAME = "marcjonsson_d2";

async function main() {
  console.log("Glooko – uppgifter för det nattliga glukosjobbet (insulindoser från pumpen)");
  console.log("Samma e-post/lösenord som du loggar in på Glooko med.\n");
  const existing = readJsonSafe(GLOOKO_FILE, {});
  const defaultUser = existing.email || DEFAULT_USERNAME;
  const email = await ask(`Användarnamn/e-post [${defaultUser}] (Enter = behåll): `, { fallback: defaultUser });
  if (!email) { console.error("Ingen e-post."); process.exit(1); }
  if (!process.stdin.isTTY) console.log("(Obs: ingen riktig konsol – lösenordet kan synas när du skriver.)");
  const password = await askHidden("Lösenord (visas inte): ");
  if (!password) { console.error("Inget lösenord."); process.exit(1); }
  const server = (await ask(`Server eu = Europa (Sverige), us = USA [${existing.server || "eu"}]: `, { fallback: existing.server || "eu" })).toLowerCase() === "us" ? "us" : "eu";

  process.stdout.write("Testar inloggningen mot Glooko (senaste 24 h)… ");
  try {
    const now = Date.now();
    const r = await fetchGlooko({ email, password, server }, { startMs: now - 24 * 3600_000, endMs: now });
    console.log("OK.");
    console.log(`  CGM-värden: ${r.readings.length} · bolusar: ${r.boluses.length} · basalposter: ${r.basals.length}`);
    for (const d of r.diag) console.log(`  ${d}`);
    writeJsonPrivate(GLOOKO_FILE, { email, password, server });
    if (!readJsonSafe(DEXCOM_FILE)?.username) {
      console.log(r.readings.length
        ? "Dexcom är inte kopplat – jobbet använder Glooko som blodsockerkälla."
        : "Obs: Glooko gav inga CGM-värden och Dexcom är inte kopplat – kör även npm run set-dexcom.");
    }
  } catch (e) {
    console.log("misslyckades.");
    console.error(`  ${e.message}`);
    const save = await ask("Spara ändå? (j/N): ");
    if (!/^j/i.test(save)) process.exit(1);
    writeJsonPrivate(GLOOKO_FILE, { email, password, server });
  }
  console.log(`Sparat i ${GLOOKO_FILE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
