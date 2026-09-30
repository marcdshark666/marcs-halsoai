# Blodsocker & mat – det nattliga glukosjobbet

Sektionen **Blodsocker & mat** på https://marcs-halsoai.vercel.app fylls varje
natt av `tools/daglig-glukos.js` (schemalagd uppgift **MarcsHalsoAI-DagligGlukos**,
dagligen **23:55**). Marc har uttryckligen valt att publicera den öppet.

```
Dexcom Share ──► dygnsstatistik ──► GlucoseDay.json ──► npm run build ──► vercel --prod
                      ▲
Telegram-länk ──► Google Foto Picker ──► matbilder ──► Gemini / claude -p ──► kolhydrater
                                              └──► CGM-kurvan 0–4 h efter maten ──► flagga
```

**Beslutsstöd, inte journalhandling.** Ingen kod här räknar eller föreslår
insulinenheter, kvoter eller faktorer – pumpens loggade doser (Glooko) visas bara som de är. Kurvflaggorna beskriver kurvans form och är underlag för samtal
med diabetesteamet.

## Filer

| Fil | Ansvar |
|---|---|
| `tools/daglig-glukos.js` | jobbet (argument: `--datum`, `--utan-bilder`, `--bara-bilder`, `--utan-deploy`, `--syntetisk`, `--vanta-min`) |
| `tools/glukos/dexcom.mjs` | Dexcom Share – kopia av Sugar Buddys `api/dexcom.js` (samma värdar, app-id, regionsfallback) |
| `tools/glukos/photos.mjs` | Google Photos **Picker API** (sessions/mediaItems), refresh-token → access-token |
| `tools/glukos/matbild.mjs` | matigenkänning: Gemini (Sugar Buddys modellstege) → reserv `claude -p` (CLI, aldrig API) |
| `tools/glukos/thumb.mjs` | miniatyr 600 px JPEG utan EXIF (ffmpeg, reserv System.Drawing) → `public/mat/ÅÅÅÅ-MM-DD/` |
| `tools/glukos/telegram.mjs` | skickar Picker-länken via `~/.claude/hooks/telegram-lib.js` |
| `tools/glukos/deploy.mjs` | höjer `SEED_VERSION`, `npm run build`, `vercel --prod --yes` (sätter `XDG_DATA_HOME`) |
| `src/lib/glukos/stats.js` | statistik – kopia av Sugar Buddys `calcStats`/`roundTo100`/`DAY_PARTS`, returnerar tal |
| `src/lib/glukos/meals.js` | måltidskurva + flaggor + `stripDoseTalk()` |
| `src/components/health/GlucoseFood.jsx` | sektionen på sajten |
| `src/api/realdata/GlucoseDay.json` | ett objekt per dygn (statistik, dygnsdelar, trend, måltider med kurva) |
| `data/cgm/ÅÅÅÅ-MM-DD.json` | råvärden per dygn `[{t, mmol}]` – bara lokalt, deployas inte |
| `tools/tests/glukos.test.mjs` | 21 handräknade fall: `npm run test:glukos` |
| `schedule/install_glukos_task.ps1` | registrerar den schemalagda uppgiften (VBS-startare, inget fönster) |

Hemligheter ligger **bara** i `%APPDATA%\marcs-halsoai\` (`dexcom.json`, `google.json`,
`gemini.json`) – utanför projektet, aldrig i git eller `dist/`. Loggar i `logs/daglig-glukos.log`.

## Marc gör själv (en gång)

### 1. Dexcom Share
```
npm run set-dexcom
```
Användarnamn, lösenord (visas inte) och region (`ous` för Sverige). Skriptet testar
inloggningen direkt. Share måste vara påslaget i Dexcom-appen med minst en följare.

### 2. Google Foto (Picker API)
Library-API:t kan sedan 31 mars 2025 inte längre läsa hela biblioteket – därför
väljer Marc bilderna själv i Googles vy via en länk i Telegram.

Använd gärna **samma Google Cloud-projekt som Sugar Buddy** (det där "Logga in med
Google" skapades). Saknas det: skapa ett nytt på console.cloud.google.com (gratis,
inget kort, aktivera ingen fakturering).

1. console.cloud.google.com → välj projektet → **APIs & Services → Library** →
   sök *Google Photos Picker API* → **Enable**.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - *Data access / Scopes* → **Add or remove scopes** → bocka
     `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` → Update → Save.
   - *Audience*: om appen står som *Testing*, lägg till `mkjonssonpf@gmail.com` under
     **Test users** (annars går refresh-tokenen ut efter 7 dagar – tryck **Publish app**
     för att slippa det).
3. **APIs & Services → Credentials**:
   - Finns Sugar Buddys *Web application*-klient: öppna den → **Authorized redirect URIs**
     → **Add URI** → `http://localhost:5246/oauth2callback` → Save. Kopiera *Client ID*
     och *Client secret* (klicka ögat/Download JSON om hemligheten är dold).
   - Annars: **Create credentials → OAuth client ID → Desktop app** → namn
     "Marcs HälsoAI glukos" → Create → kopiera Client ID och Client secret.
4. På datorn:
   ```
   npm run google-login
   ```
   Klistra in Client ID, klienthemligheten (visas inte), godkänn i webbläsaren som
   öppnas. Refresh-tokenen sparas i `%APPDATA%\marcs-halsoai\google.json`.
5. Testa: `npm run glukos -- --bara-bilder --utan-deploy` → länken kommer i Telegram.

### 3. (Frivilligt) Gemini-nyckel för matigenkänningen
```
npm run set-gemini
```
Klistra in samma gratis `GEMINI_API_KEY` som Sugar Buddy använder (finns i Sugar
Buddys Vercel-projekt → Settings → Environment Variables, eller ny på
aistudio.google.com/apikey). Utan nyckel används lokala `claude -p` – fungerar också,
men tar Claude-kvot.

## Varje kväll

23:55 startar jobbet. Marc får ett Telegram-meddelande **"Dagens matbilder"** med en
länk → tryck, bocka dagens matfoton, klart. Jobbet väntar 40 min; väljs inget går sidan
ut med bara blodsockret. Bilder kan väljas i efterhand:
`npm run glukos -- --bara-bilder --datum 2026-09-28`.

## Kurvflaggorna (deterministiska, `src/lib/glukos/meals.js`)

| Flagga | Villkor |
|---|---|
| *Möjligen för lite insulin eller sent bolus* | värdet vid +2 h > 10 mmol/L **och** fortfarande stigande (≥ 0,3 mmol/L de senaste 20 min), **eller** +3 h > start + 3 mmol/L |
| *Möjligen för mycket insulin* | något värde < 3,9 mmol/L inom 4 h |
| *preliminär* | serien når inte 4 h efter måltiden – bedöms om natten efter |
| *ny måltid inom 3 h* | kurvan kan inte tolkas ensam |

Texten på sajten formuleras alltid som ett mönster att ta upp med diabetesteamet.
`stripDoseTalk()` filtrerar dessutom bort varje mening från språkmodellen som nämner
enheter eller doser.

## Insulin via Glooko (doser + mönster + Telegram-larm)

```
npm run set-glooko      # e-post, lösenord (visas inte), server eu/us – testar inloggningen
```
Sparas i `%APPDATA%\marcs-halsoai\glooko.json`. Varje natt hämtas gårdagens och dagens
bolusar (tid, enheter, kolhydrater) och basalposter → `insulin` på dygnsposten.
Saknas Dexcom men Glooko ger CGM blir Glooko blodsockerkällan (en inloggning räcker).

| Fil | Ansvar |
|---|---|
| `tools/glukos/glooko.mjs` | Node-kopia av Sugar Buddys `api/glooko.js` (sign_in, EU/US, kandidat-endpoints, normalisering, `diag` utan uppgifter) |
| `src/lib/glukos/doses.js` | observationsdelen av Sugar Buddys `doseInsights.js` (gren `dosinsikt`) – **utan** procent, faktorer, kvoter och dosförslag |
| `tools/tests/doser.test.mjs` | handräknade fall för dosanalys, mönster och Glooko-normalisering |
| `data/glukos-larm.json` | vilka mönster som larmats och när (max ett larm per dygn) |

Mönster över 14 dygn (minst 3 bedömbara observationer, minst 2 träffar och ≥ 1/3):
korrektion → lågt < 3,9 inom 4 h (larm) · korrektion kvar > 10 efter 3 h · måltidsbolus → lågt
(larm) · måltidsbolus > 10 efter 3 h (även bara stora måltider ≥ 60 g) · natt 23–06 < 3,9 (larm) ·
ostörd natt stiger/sjunker > 1,5 · dygn med > 25 % över 13,9 (larm) · > 13,9 i ≥ 3 h utan bolus
= ketonrisk (larm). Telegram går bara när ett larmvärt mönster är nytt/fler träffar/7 dygn sedan,
max en gång per dygn, med beslutsstödstexten. Ingen kod räknar doser, kvoter eller faktorer
(`DOSE_TALK`-spärren testas).

Sugar Buddys egna värden ligger bara i mobilwebbläsarens localStorage och kan inte läsas härifrån.

## Testa utan riktiga uppgifter
```
npm run test:glukos                                   # 21 handräknade fall
npm run glukos -- --syntetisk --datum 2026-09-29      # tydligt markerad testdata → tools/tests/out/ (deployar aldrig)
```
