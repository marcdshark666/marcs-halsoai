# Marcs HälsoAI

Personlig hälsoöversikt och utredningsplan för Marc – 28-årig man med typ
1-diabetes, astma, recidiverande infektioner och ofrivillig viktnedgång från
89 kg till 84–86 kg under fem månader.

Sajten är en strukturkopia av Bertils HälsoAI, men **utan Bertils journal,
provsvar eller bilder**. Allt kliniskt innehåll här gäller Marc.

## Vad som finns

- **Viktigast att bevaka nu** – nio prioriteringar med motivering, nästa steg
  och länkade studier (differentialdiagnoser: glykemisk kontroll, celiaki,
  tyreoideasjukdom, CVID, CFTR-relaterad sjukdom, malignitet, autoimmun
  klustring).
- **Att göra · utredningsplan** – tolv åtgärder i prioriterad ordning. Klicka
  **Varför?** på en rad för att fälla ut motiveringen; studieknapparna scrollar
  automatiskt ner till rätt studie i evidensbanken och markerar den.
- **Utredningsplan** – de åtta prioriterade proven och undersökningarna.
- **Evidenssök** – 19 källor (ADA Standards of Care 2026, Gastroenterology 2024,
  Front Immunol 2021, JAMA Intern Med 2025, BMJ 2024 m.fl.) med kategorifilter.
- **Daglig checklista** – blodsocker, insulin, vikt, astma och infektionstecken.

## Vad som saknas

`src/api/realdata/LabResult.json`, `JournalEntry.json`, `Medication.json` och
`AdverseDrugHistory.json` är tomma – Marcs egna värden läggs in där när de
finns. Höj `SEED_VERSION` i `src/api/base44Client.js` när du ändrar dem,
annars behåller återvändande besökare den gamla kopian i localStorage.

Labbkategorierna som dashboarden filtrerar på finns i `CATEGORIES` överst i
`src/pages/Dashboard.jsx`.

## Redigera innehåll

Allt redaktionellt innehåll ligger i `src/data/content.js` – prioriteringar,
kroppskartans markörer, viktkortet, utredningsplanen, checklistan, kliniska
noteringar och evidensbanken. Ändra där, inte i komponenterna.

## Kör lokalt

```bash
npm install
npm run dev
```

Startar på http://localhost:5245.

## Deploy

```bash
vercel --prod
```

Beslutsstöd, inte journalhandling.
