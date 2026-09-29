#!/usr/bin/env node
// npm run set-dexcom — Marc skriver in sina Dexcom Share-uppgifter SJÄLV.
// Lösenordet ekas inte och sparas i %APPDATA%\marcs-halsoai\dexcom.json
// (utanför projektet, aldrig i git eller dist). Ingen AI-session ska någonsin
// köra det här åt honom eller skriva lösenordet.
import { DEXCOM_FILE, readJsonSafe, writeJsonPrivate, ask, askHidden } from "./glukos/config.mjs";
import { fetchDexcomReadings } from "./glukos/dexcom.mjs";

async function main() {
  console.log("Dexcom Share – uppgifter för det nattliga glukosjobbet");
  console.log("Samma användarnamn/lösenord som i Dexcom-appen (Share måste vara påslaget, minst en följare).\n");
  const existing = readJsonSafe(DEXCOM_FILE, {});
  const username = await ask(`Användarnamn${existing.username ? ` [${existing.username}]` : ""}: `, { fallback: existing.username || "" });
  if (!username) { console.error("Inget användarnamn."); process.exit(1); }
  if (!process.stdin.isTTY) console.log("(Obs: ingen riktig konsol – lösenordet kan synas när du skriver.)");
  const password = await askHidden("Lösenord (visas inte): ");
  if (!password) { console.error("Inget lösenord."); process.exit(1); }
  const region = (await ask(`Region ous = utanför USA (Sverige), us = USA [${existing.region || "ous"}]: `, { fallback: existing.region || "ous" })).toLowerCase() === "us" ? "us" : "ous";

  process.stdout.write("Testar inloggningen mot Dexcom… ");
  try {
    const { readings, region: used } = await fetchDexcomReadings({ username, password, region }, { minutes: 60, maxCount: 12 });
    console.log(`OK (${readings.length} värden senaste timmen, region ${used}).`);
    writeJsonPrivate(DEXCOM_FILE, { username, password, region: used });
  } catch (e) {
    console.log("misslyckades.");
    console.error(`  ${e.message}`);
    const save = await ask("Spara ändå? (j/N): ");
    if (!/^j/i.test(save)) process.exit(1);
    writeJsonPrivate(DEXCOM_FILE, { username, password, region });
  }
  console.log(`Sparat i ${DEXCOM_FILE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
