// ============================================================================
// MARCS HÄLSOAI – ALLT REDIGERBART INNEHÅLL SAMLAT PÅ ETT STÄLLE
// ============================================================================
// Rådata (labbsvar, journal, åtgärder, mediciner) ligger i
// src/api/realdata/*.json och seedas till localStorage vid första start.
// Det här är de härledda, redaktionella delarna: diagnoser, prioriteringar,
// kroppskarta, rekommenderade prover, behandlingsplan och evidensbank.
//
// Underlag: journalanteckningar 2018-09-27 – 2026-04-20 samt provsvar från
// 15 provtagningstillfällen 2018-09-25 – 2026-02 (271 mätvärden, 74 analyser)
// och CGM-data 6–19 april 2026.
//
// Klinisk bild: 28-årig man med typ 1-diabetes sedan 11 års ålder,
// bronkiektasier, kronisk bronkit, kronisk rinosinuit, recidiverande
// luftvägsinfektioner och ofrivillig viktnedgång 89 → 84–86 kg på fem månader.
// ============================================================================

export const APP_NAME = "Marcs HälsoAI";

export const PATIENT = {
  first_name: "Marc",
  full_name: "Marc",
  email: "marc@example.se",
  // Lägg ett foto i public/ och peka hit (t.ex. "/marc.jpg"). Saknas filen
  // faller navigeringen tillbaka på den tecknade profilen automatiskt.
  avatar_url: "/profil.svg",
  avatar_fallback: "/profil.svg",
  summary:
    "28-årig man. Typ 1-diabetes sedan 11 års ålder, bronkiektasier och kronisk bronkit, kronisk rinosinuit sedan 16-årsåldern, recidiverande luftvägsinfektioner (H. influenzae, S. aureus). Ofrivillig viktnedgång 89 → 84–86 kg på fem månader.",
};

export const CALENDAR_SUBTITLE = "Bronkiektasier, viktnedgång och obesvarade frågor";

export const FOOTER_TEXT =
  "Sammanställt ur journal 2018–2026 och 271 provsvar · Beslutsstöd, inte journalhandling";

// ---------------------------------------------------------------------------
// Diagnoser och kliniska fynd
// ---------------------------------------------------------------------------

export const DIAGNOSES = [
  { icon: "droplet", label: "Diabetes mellitus typ 1", detail: "Sedan 11 års ålder. Insulinpump och Dexcom G7." },
  { icon: "activity", label: "Bronkiektasier och kronisk bronkit", detail: "Permanenta utvidgningar i luftrören. Daglig slemproduktion." },
  { icon: "shield", label: "Recidiverande luftvägsinfektioner", detail: "Haemophilus influenzae (jan 2025), Staphylococcus aureus (feb 2025)." },
  { icon: "eye", label: "Kronisk rinosinuit", detail: "Sedan 16-årsåldern. Daglig nästäppa, slem, uttalad snarkning." },
  { icon: "heart", label: "Erektil dysfunktion och hyperöstrogenism", detail: "Östradiol 207 pmol/L med normalt testosteron 28 nmol/L." },
  { icon: "microscope", label: "Lymfadenopati", detail: "Stabil knöl subklavikulärt sedan 20-årsåldern, nytillkommen 0,8 cm på halsen april 2025." },
  { icon: "pill", label: "Paronyki höger stortå", detail: "Feb–apr 2025. Krävde peroral antibiotika efter utebliven effekt av lokalbehandling." },
];

// ---------------------------------------------------------------------------
// Kroppskarta
// ---------------------------------------------------------------------------

/**
 * Bilder och film som roterar i kortet uppe till vänster. Tomt tills Marcs
 * egna bilder lagts in – då visas den tecknade kroppskartan i stället.
 * Form: { type: "video" | "image", src, caption }
 */
export const BODY_MEDIA = [];

/** Hur länge varje bild eller film visas innan nästa tonas in. */
export const BODY_MEDIA_ROTATE_MS = 30000;

/** Reserv om inga media är inlagda – den tecknade kroppskartan. */
export const BODY_MAP_IMAGE = "/kroppskarta.svg";

export const ORGAN_HOTSPOTS = [
  {
    id: "sinus",
    label: "Bihålor",
    detail: "Kronisk rinosinuit sedan 16 års ålder. DT bihålor planerad men aldrig genomförd.",
    x: 50, y: 10, size: 10,
    color: "#FBBF24",
    pulse: true,
  },
  {
    id: "neck_node",
    label: "Halsknöl höger",
    detail: "0,8 cm, nytillkommen april 2025. Aldrig bildutredd.",
    x: 58, y: 17, size: 9,
    color: "#F43F5E",
    pulse: true,
  },
  {
    id: "subclav",
    label: "Subklavikulär knöl",
    detail: "Stabil sedan 20-årsåldern.",
    x: 38, y: 24, size: 9,
    color: "#C084FC",
    pulse: false,
  },
  {
    id: "lungs",
    label: "Luftrör",
    detail: "Bronkiektasier med daglig slemproduktion. H. influenzae och S. aureus 2025.",
    x: 45, y: 29, size: 17,
    color: "#FF6B35",
    pulse: true,
  },
  {
    id: "pancreas",
    label: "Bukspottkörtel",
    detail: "Typ 1-diabetes sedan 11 års ålder. HbA1c 49 (jan 2026).",
    x: 54, y: 38, size: 14,
    color: "#38BDF8",
    pulse: false,
  },
  {
    id: "kidney",
    label: "Njurar",
    detail: "Kreatinin 107 och eGFR 73 (jan 2026). Ingen albuminuri.",
    x: 41, y: 43, size: 11,
    color: "#2DD4BF",
    pulse: false,
  },
  {
    id: "weight",
    label: "Vikt",
    detail: "89 → 84–86 kg på fem månader.",
    x: 63, y: 48, size: 12,
    color: "#A3E635",
    pulse: true,
  },
  {
    id: "hormone",
    label: "Hormonaxel",
    detail: "Östradiol 207 pmol/L, erektil dysfunktion. hCG aldrig taget.",
    x: 50, y: 57, size: 12,
    color: "#F472B6",
    pulse: true,
  },
  {
    id: "toe",
    label: "Höger stortå",
    detail: "Paronyki feb–apr 2025, läkte först på peroral antibiotika.",
    x: 45, y: 95, size: 10,
    color: "#94A3B8",
    pulse: false,
  },
];

// ---------------------------------------------------------------------------
// Vikt – den mätbara varningssignalen
// ---------------------------------------------------------------------------

/**
 * Viktkortet uppe till vänster. Lägg in uppmätta värden i `points` allteftersom
 * Marc väger sig, så ritas kurvan om automatiskt.
 */
export const WEIGHT = {
  start_kg: 89,
  current_low_kg: 84,
  current_high_kg: 86,
  months: 5,
  note:
    "Ofrivillig viktnedgång trots ansträngning att gå upp. Glykemisk kontroll förklarar den inte – HbA1c har legat 40–49 mmol/mol. Kronisk suppurativ lungsjukdom är nu huvudspåret.",
  // Ungefärlig kurva utifrån uppgivet förlopp. Ersätt med uppmätta värden.
  points: [
    { label: "start", kg: 89 },
    { label: "+2 mån", kg: 87.5 },
    { label: "+4 mån", kg: 86 },
    { label: "nu", kg: 85 },
  ],
};

// ---------------------------------------------------------------------------
// Daglig checklista
// ---------------------------------------------------------------------------

export const DAILY_CHECKLIST_TASKS = [
  { id: "glucose_morning", label: "Fasteblodsocker", icon: "droplet", period: "morgon" },
  { id: "airway_clearance_am", label: "Sekretmobilisering (PEP/huffing)", icon: "activity", period: "morgon" },
  { id: "nasal_rinse_am", label: "Nässköljning med budesonid", icon: "eye", period: "morgon" },
  { id: "inhaler_am", label: "Anoro + Oxis tagna", icon: "pill", period: "morgon" },
  { id: "weight_log", label: "Vikt – samma våg, samma tid (1 ggr/vecka)", icon: "heart", period: "morgon" },
  { id: "glucose_evening", label: "Blodsocker kväll", icon: "droplet", period: "kväll" },
  { id: "meal_doses", label: "Måltidsdoser genomgångna", icon: "pill", period: "kväll" },
  { id: "airway_clearance_pm", label: "Sekretmobilisering kväll", icon: "activity", period: "kväll" },
  { id: "nasal_rinse_pm", label: "Nässköljning kväll", icon: "eye", period: "kväll" },
  { id: "food_log", label: "Ätit enligt plan (kalorier noterade)", icon: "heart", period: "kväll" },
  { id: "sign_fever", label: "Feber eller frossa", icon: "alert", period: "infektionstecken" },
  { id: "sign_sputum", label: "Ökad slemmängd eller färgförändring", icon: "alert", period: "infektionstecken" },
  { id: "sign_hemoptysis", label: "Blod i upphostningarna", icon: "alert", period: "infektionstecken" },
  { id: "sign_dyspnea", label: "Ny eller ökad andfåddhet", icon: "alert", period: "infektionstecken" },
  { id: "sign_nightsweat", label: "Nattsvettningar", icon: "alert", period: "infektionstecken" },
  { id: "sign_sinus", label: "Bihålevärk eller ansiktstryck", icon: "alert", period: "infektionstecken" },
  { id: "sign_skin", label: "Sår eller hudinfektion som inte läker", icon: "alert", period: "infektionstecken" },
];

export const CHECKLIST_ALERT_NOTE =
  "Kryssa i det du faktiskt haft. Nattsvettningar och blod i upphostningarna är de två som ska få dig att höra av dig direkt – de hör till både NTM-frågan och malignitetsfrågan. Ökad slemmängd med färgförändring är den vanligaste tidiga signalen på en exacerbation.";

// ---------------------------------------------------------------------------
// Rekommenderade prover – rangordnade efter kliniskt utbyte
// ---------------------------------------------------------------------------

/**
 * `value` styr färg och rangordning i RecommendedTests.jsx:
 * "mycket hög" | "hög" | "medel" | "låg"
 */
export const RECOMMENDED_TESTS = [
  {
    rank: 1,
    name: "Sputumodling för mykobakterier – 3 morgonprov",
    sample: "Odling",
    value: "mycket hög",
    answers: "Har du en infektion med icke-tuberkulösa mykobakterier (NTM) i bronkiektasierna?",
    why:
      "NTM, framför allt Mycobacterium avium-komplexet, växer gärna i bronkiektasier och ger just den här triaden: ökande lungförändringar, långdragen slemproduktion och ofrivillig viktnedgång. Ingen mykobakterieodling finns i underlaget – bara vanlig bakterieodling som visat H. influenzae och S. aureus. Vanlig odling hittar inte NTM; provet måste beställas särskilt och tas tre morgnar i rad.",
    changes:
      "Positivt fynd förklarar viktnedgången och byter behandling helt – kombinationsbehandling i minst tolv månader efter negativ odling. Lika viktigt åt andra hållet: ett negativt svar krävs innan makrolidprofylax får sättas in, eftersom azitromycin i monoterapi vid odiagnostiserad NTM skapar makrolidresistens och förstör den viktigaste behandlingskomponenten.",
    where: "Lung- och allergimottagningen",
    study_refs: ["ntm_ats_2020", "bronkiektasi_bts_2019", "makrolid_bat_2013"],
  },
  {
    rank: 2,
    name: "HRCT thorax",
    sample: "Bilddiagnostik",
    value: "mycket hög",
    answers: "Hur utbredda är bronkiektasierna, och finns det fynd som pekar mot NTM?",
    why:
      "Bronkiektasiernas utbredning och typ är aldrig kvantifierad i underlaget. Det som finns är bronkoskopi januari 2025 och slätröntgen februari 2025 med \"partiell förbättring\" – och slätröntgen är otillräcklig för att bedöma bronkiektasier. HRCT visar utbredning, mucus plugging och de småknottriga trädtoppsförändringar som talar för mykobakterier.",
    changes:
      "Ger utgångsvärdet som all framtida uppföljning mäts mot, avgör hur intensiv sekretmobilisering och profylax som behövs, och kan flytta NTM-frågan från möjlig till sannolik. Fynd av utbredd sjukdom motiverar också att PCD-frågan drivs hela vägen.",
    where: "Röntgen, remiss från lungmottagningen",
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_bts_2019", "ntm_ats_2020"],
  },
  {
    rank: 3,
    name: "Nasalt kväveoxid (nNO)",
    sample: "Fysiologi",
    value: "hög",
    answers: "Kan primär ciliär dyskinesi (PCD) förklara både luftrören och bihålorna?",
    why:
      "Det här är den enskilt viktigaste diagnos som aldrig har övervägts. PCD ger exakt din kombination: bronkiektasier, kronisk rinosinuit sedan tonåren, daglig nästäppa, uttalad snarkning och recidiverande luftvägsinfektioner – och de två vanligaste alternativen är redan uteslutna hos dig (svettklorid 9, immunglobuliner normala). Nasalt kväveoxid är utandningsprov i näsan, tar några minuter och är kraftigt sänkt vid PCD.",
    changes:
      "Lågt nNO leder vidare till högfrekvent videomikroskopi av cilierna och genetisk testning. En PCD-diagnos ändrar uppföljningen (strukturerad sekretmobilisering, tätare odlingar), ger ärftlighetsrådgivning och förklarar hela sjukdomsbilden med en enda mekanism. Fråga samtidigt om upprepade öroninflammationer som barn, andningsstörning som nyfödd, situs inversus och nedsatt fertilitet.",
    where: "PCD-centrum eller lungfysiologi, remiss från lungmottagningen",
    study_refs: ["pcd_ers_2017", "bronkiektasi_ers_2017"],
  },
  {
    rank: 4,
    name: "tTG-IgA + total-IgA",
    sample: "Blodprov",
    value: "hög",
    answers: "Har du celiaki?",
    why:
      "Aldrig taget, trots typ 1-diabetes sedan 11 års ålder – där celiaki förekommer hos 5–16 % mot cirka 1 % i befolkningen – och trots ofrivillig viktnedgång. Din total-IgA har mätts tre gånger (2,0 / 2,2 / 1,5 g/L) och är normal, så serologin blir tolkbar. Provet är billigt och kan tas i samma stick som allt annat.",
    changes:
      "Positivt svar leder till gastroskopi med biopsi, och behandlingen – glutenfri kost – kan vända viktnedgången direkt. Provet måste tas under pågående glutenintag, annars blir svaret falskt negativt.",
    where: "Vårdcentral eller diabetesmottagning",
    study_refs: ["celiaki_who_to_test", "ada_children_2026", "ada_comorbid_2026"],
  },
  {
    rank: 5,
    name: "Ultraljud hals, vid behov med finnålspunktion",
    sample: "Bilddiagnostik",
    value: "hög",
    answers: "Vad är knölen på halsen, och har den något med viktnedgången att göra?",
    why:
      "En nytillkommen 0,8 cm stor knöl på höger halssida noterades i egen anteckning 14 april 2025, och en knöl subklavikulärt har funnits sedan 20-årsåldern. Ingen av dem har bildutretts enligt underlaget. En ny lymfkörtel tillsammans med ofrivillig viktnedgång ska alltid utredas – även om reaktiv körtelsvullnad är den mest sannolika förklaringen hos någon med kroniska luftvägsinfektioner.",
    changes:
      "Ultraljudet skiljer reaktiv körtel från patologisk på storlek, form och kärlmönster. Ser körteln patologisk ut görs finnålspunktion. Ett normalt fynd stänger malignitetsfrågan, som annars ligger kvar och skaver bakom varje annat provsvar.",
    where: "Röntgen eller ÖNH, remiss från vårdcentral",
    study_refs: ["weightloss_cancer_bmj", "weightloss_occult_cancer"],
  },
  {
    rank: 6,
    name: "hCG, prolaktin, omprov östradiol samt testikelundersökning",
    sample: "Blodprov + undersökning",
    value: "hög",
    answers: "Varför är östradiol förhöjt, och finns det en hormonproducerande tumör bakom?",
    why:
      "Östradiol 207 pmol/L med normalt testosteron (28), normalt LH (2,1) och normalt SHBG (54), tillsammans med erektil dysfunktion. Hos en 28-årig man är hCG-producerande testikeltumör den diagnos man inte får missa – den skulle dessutom kunna förklara viktnedgången. Vanligare orsaker är läkemedel, leverpåverkan och analysfel. ASAT var 1,13 µkat/L i juni 2025 men hade normaliserats till 0,60 i januari 2026.",
    changes:
      "Förhöjt hCG innebär akut vidare utredning. Normalt hCG och normal testikelpalpation gör bilden benign, och då räcker ett omprov av östradiol med masspektrometri. Be samtidigt labbet bekräfta fritt testosteron 11 – enheten nmol/L är sannolikt felaktig, värdet ser ut att vara i pmol/L.",
    where: "Vårdcentral, ultraljud testiklar via remiss",
    study_refs: ["gynekomasti_nejm_2007", "weightloss_occult_cancer"],
  },
  {
    rank: 7,
    name: "Vaccinationssvar (pneumokockantikroppar före och efter) + IgG-subklasser 1–4",
    sample: "Blodprov",
    value: "medel",
    answers: "Har du en antikroppsdefekt trots att total-IgG är normalt?",
    why:
      "Dina totala immunglobuliner är normala vid tre tillfällen (IgG 11 → 11,9 → 12,0), vilket utesluter CVID. Men specifik antikroppsbrist och IgG-subklassbrist ger samma kliniska bild – recidiverande sinopulmonella infektioner med just H. influenzae och S. aureus – med normalt total-IgG. De hittas bara genom att mäta svaret på pneumokockvaccination.",
    changes:
      "Uteblivet vaccinationssvar innebär remiss till immunolog, pneumokockvaccination och i vissa fall immunglobulinsubstitution. Normalt svar stänger immunbristfrågan definitivt och flyttar tyngdpunkten till PCD.",
    where: "Immunologmottagning, remiss från lungmottagningen",
    study_refs: ["iei_practice_parameter_2025", "cvid_systematic_review", "bronkiektasi_ers_2017"],
  },
  {
    rank: 8,
    name: "Rutinodling sputum inklusive Pseudomonas – var tredje till sjätte månad",
    sample: "Odling",
    value: "medel",
    answers: "Har luftvägarna koloniserats av Pseudomonas aeruginosa?",
    why:
      "Kronisk Pseudomonaskolonisering är den enskilt viktigaste prognostiska faktorn vid bronkiektasier – den ger fler exacerbationer, snabbare lungfunktionsförlust och sämre livskvalitet. Vid nyupptäckt växt går det ofta att eradikera, men tidsfönstret är kort, vilket är hela poängen med regelbunden övervakning i stället för odling först när något händer.",
    changes:
      "Nyfynd utlöser eradikeringsförsök. Odlingarna ger dessutom det resistensmönster som styr antibiotikavalet vid nästa exacerbation – i stället för att gissa som vid Doxyferm- och Trim-Sulfa-kurerna 2025.",
    where: "Lung- och allergimottagningen",
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_bts_2019", "bronkiektasi_registry_2017"],
  },
  {
    rank: 9,
    name: "Näringsstatus: ferritin, B12, folat, 25-OH-vitamin D, zink",
    sample: "Blodprov",
    value: "medel",
    answers: "Finns ett malabsorptionsmönster, och är D-vitaminbristen kvar?",
    why:
      "D-vitamin var 58 nmol/L redan i september 2018 och har aldrig kontrollerats om på åtta år. Låga nivåer är kopplade till ökad infektionsbenägenhet, vilket är direkt relevant vid bronkiektasier. Flera samtidigt låga näringsmarkörer stärker dessutom celiakimisstanken oavsett hur serologin utfaller.",
    changes:
      "Substitution är enkel och billig. Ett tydligt malabsorptionsmönster motiverar gastroskopi även vid negativ celiakiserologi.",
    where: "Vårdcentral, samma stick som celiakiproverna",
    study_refs: ["celiaki_who_to_test", "ada_comorbid_2026", "bronkiektasi_bts_2019"],
  },
  {
    rank: 10,
    name: "Kreatinin + cystatin C + U-albumin/kreatinin – omkontroll",
    sample: "Blodprov + urinprov",
    value: "medel",
    answers: "Är njurfunktionen på väg ned eller är variationen mätbrus?",
    why:
      "Kreatinin var 107 µmol/L med eGFR 73 i januari 2026, mot 90 och eGFR 86 ett halvår tidigare. Serien sedan 2019 pendlar: 111 → 83 → 94 → 99 → 90 → 107. Albuminuri saknas genomgående (U-alb/krea 0,2–0,6), vilket talar emot diabetesnefropati. Kreatinin påverkas av muskelmassa, proteinintag och vätskestatus – cystatin C gör inte det och gav eGFR 88 år 2024.",
    changes:
      "Bekräftad nedgång innebär tätare uppföljning och försiktighet med nefrotoxiska antibiotika, vilket är direkt relevant om NTM- eller Pseudomonasbehandling blir aktuell. Är det variation ska den inte förväxlas med progress.",
    where: "Vårdcentral eller diabetesmottagning",
    study_refs: ["ada_comorbid_2026"],
  },
  {
    rank: 11,
    name: "DT bihålor",
    sample: "Bilddiagnostik",
    value: "medel",
    answers: "Hur utbredd är rinosinuiten – och stödjer den PCD-misstanken?",
    why:
      "Undersökningen planerades av dr Karin Toll på Karolinska ÖNH den 17 april 2025. Något svar finns inte i underlaget, och det finns inget som visar att den blivit av. Utbredd pansinuit hos en vuxen med bronkiektasier stärker PCD-misstanken påtagligt.",
    changes:
      "Utöver PCD-frågan avgör den om det finns en kirurgiskt åtgärdbar komponent, och om bihålorna fungerar som reservoar för de bakterier som återkommer i luftvägarna.",
    where: "Karolinska ÖNH – efterhör den planerade undersökningen",
    study_refs: ["rinosinuit_epos_2020", "pcd_ers_2017"],
  },
  {
    rank: 12,
    name: "Spirometri med reversibilitet + diffusionskapacitet (DLCO)",
    sample: "Fysiologi",
    value: "medel",
    answers: "Vad är utgångsläget för lungfunktionen, och finns en reversibel komponent?",
    why:
      "Spirometrin i februari 2025 visade FEV1/FVC 0,72 – lätt obstruktivitet – men reversibilitetstest saknas i underlaget, och du står ändå på både LAMA och LABA. Diffusionskapacitet har aldrig mätts.",
    changes:
      "Finns ingen reversibilitet kan luftrörsvidgande behandling omprövas i stället för att bara byggas på. Utgångsvärdet behövs också för att avgöra om bronkiektasierna progredierar.",
    where: "Lungfysiologi",
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_bts_2019"],
  },
  {
    rank: 13,
    name: "Total-IgE + Aspergillus-antikroppar (ABPA-screening)",
    sample: "Blodprov",
    value: "låg",
    answers: "Kan allergisk bronkopulmonell aspergillos ligga bakom bronkiektasierna?",
    why:
      "ABPA är en av standarddiagnoserna att utesluta vid bronkiektasier. Hos dig är den osannolik – eosinofila har varit under 0,1 vid samtliga mätningar 2019, 2024 och 2025, och ABPA ger nästan alltid eosinofili. Provet är ändå med, eftersom det är billigt och stänger en fråga som annars återkommer.",
    changes:
      "Positivt svar innebär kortison och antimykotisk behandling – helt annan väg. Negativt svar stryker ett alternativ från listan.",
    where: "Lung- och allergimottagningen",
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_registry_2017"],
  },
  {
    rank: 14,
    name: "HbA1c var tredje månad + strukturerad CGM-genomgång",
    sample: "Blodprov",
    value: "låg",
    answers: "Är den stigande HbA1c-trenden reell, och kan hypoglykemierna minskas?",
    why:
      "Lågt utbyte just för viktfrågan – glukosuri kräver betydligt högre nivåer än dina. Men trenden 40 → 45 → 48 → 49 mmol/mol på arton månader är entydig, och CGM-data 6–19 april visar 5 % av tiden under 3,9 mmol/L varav 1 % under 3,0, med standardavvikelse 3,1. Variabiliteten är ett eget problem, oberoende av medelvärdet.",
    changes:
      "Ger underlag för kolhydratkvoten, som pendlat mellan 1:12 och 1:13 utan att landa, och för en fungerande strategi vid fysisk aktivitet – anteckningarna visar att enbart basalsänkning inte räckt vid padel.",
    where: "Centrum för diabetes",
    study_refs: ["ada_diagnosis_2026", "t1d_jama_2026"],
  },
];

/** Vad de befintliga proverna redan har svarat på – så att de inte tas om. */
export const RULED_OUT = [
  {
    title: "Cystisk fibros",
    finding: "Svettklorid 9 mmol/L (2019-11-11)",
    excludes: "Under 30 mmol/L talar emot CF. Klassisk cystisk fibros är utesluten.",
    caveat: "CFTR-relaterad sjukdom med normalt svettest förekommer men är ovanligt. Gensekvensering bara om HRCT och klinik talar starkt för det.",
    study_refs: ["cf_diagnos_2017", "cftr_heterozygotes_2025"],
  },
  {
    title: "CVID och generell antikroppsbrist",
    finding: "IgG 11 → 11,9 → 12,0 g/L, IgA 2,0 / 2,2 / 1,5, IgM 0,96 / 0,92 / 0,98 (2019 och 2025)",
    excludes: "Normala immunglobuliner vid tre tillfällen över sex år. CVID är utesluten.",
    caveat: "Utesluter INTE specifik antikroppsbrist eller IgG-subklassbrist – de kräver vaccinationssvar (prov 7).",
    study_refs: ["cvid_systematic_review", "iei_practice_parameter_2025"],
  },
  {
    title: "Alfa-1-antitrypsinbrist",
    finding: "1,3 g/L (2019-08-15) och 1,2 g/L (2025-06-03)",
    excludes: "Normala nivåer vid två tillfällen. Utesluten som orsak till lungsjukdomen.",
    caveat: "",
    study_refs: ["bronkiektasi_ers_2017"],
  },
  {
    title: "Hypertyreos som orsak till viktnedgången",
    finding: "TSH 2,2 och fritt T4 20 pmol/L (2026-01-08); TSH 1,7 och fritt T4 19 (2024-07-05)",
    excludes: "Normal sköldkörtelfunktion aktuellt. Hypertyreos förklarar inte viktnedgången.",
    caveat: "Werlabs flaggade fritt T4 som lätt förhöjt 2018 och Ekerö markerade det utanför sitt intervall 7,6–16 i december 2018 – olika laboratorier, olika referensintervall.",
    study_refs: ["ada_comorbid_2026", "t1d_lancet_2023"],
  },
  {
    title: "Glukosuri som orsak till viktnedgången",
    finding: "HbA1c 40 (2024) → 45 → 48 → 49 mmol/mol (2026-01). CGM april 2026: GMI 50,3, 74 % tid i målområde",
    excludes: "Kalorieförlust via urinen kräver betydligt högre glukosnivåer. Osannolik förklaring.",
    caveat: "Trenden uppåt är ändå värd att bryta, och 5 % av tiden under 3,9 mmol/L är i sig ett problem.",
    study_refs: ["ada_diagnosis_2026", "t1d_jama_2026"],
  },
  {
    title: "Anemi och järnbrist",
    finding: "Hb 154–170 g/L genomgående 2018–2026, ferritin 84–187 µg/L",
    excludes: "Ingen anemi, inga tecken till järnbrist.",
    caveat: "",
    study_refs: [],
  },
  {
    title: "Diabetesnefropati med albuminuri",
    finding: "U-albumin/kreatinin 0,2–0,6 g/mol vid samtliga mätningar 2019–2026",
    excludes: "Ingen albuminuri. Talar emot diabetesnefropati som förklaring till kreatininvariationen.",
    caveat: "eGFR-variationen kvarstår oförklarad – se prov 10.",
    study_refs: ["ada_comorbid_2026"],
  },
];

// ---------------------------------------------------------------------------
// Klinisk prioriteringspanel
// ---------------------------------------------------------------------------

export const CLINICAL_PRIORITIES = [
  {
    title: "Icke-tuberkulösa mykobakterier är aldrig odlade – och måste uteslutas innan profylax sätts in",
    severity: "akut",
    why:
      "Bronkiektasier plus tilltagande lungförändringar plus ofrivillig viktnedgång är den klassiska presentationen för NTM-infektion, framför allt Mycobacterium avium-komplexet. I hela materialet finns bara vanliga bakterieodlingar – H. influenzae i januari 2025 och S. aureus i februari 2025. Vanlig odling påvisar inte mykobakterier; provet måste beställas särskilt. Det finns dessutom en fälla här: nästa logiska steg vid recidiverande exacerbationer är makrolidprofylax, men azitromycin i monoterapi vid odiagnostiserad NTM ger makrolidresistens och förstör den viktigaste komponenten i en framtida behandling.",
    next_step:
      "Beställ sputumodling för syrafasta stavar, tre morgonprov, tillsammans med HRCT thorax. Sätt inte in makrolidprofylax innan svaret är negativt.",
    related_tests: ["CRP", "LPK", "Neutrofila"],
    action_match: ["mykobakterier", "NTM", "HRCT"],
    study_refs: ["ntm_ats_2020", "bronkiektasi_bts_2019", "makrolid_bat_2013"],
  },
  {
    title: "Viktnedgången förklaras inte av diabetesen – kronisk suppurativ lungsjukdom är huvudspåret",
    severity: "akut",
    why:
      "Den första hypotesen vid viktnedgång hos någon med typ 1-diabetes är glukosuri vid dålig kontroll. Den hypotesen faller på dina egna siffror: HbA1c 40 mmol/mol i juli 2024, sedan 45, 48 och 49, och CGM 6–19 april 2026 med GMI 50,3 och 74 % tid i målområde. Det är för bra för att ge kalorieförlust via urinen. Kvar står den kroniska luftvägsinfektionen: bronkiektasier med daglig purulent sekretion driver energiförbrukning och systemisk inflammation, och är en väletablerad orsak till viktnedgång. Sköldkörtel, anemi och antikroppsbrist är redan uteslutna med befintliga prover.",
    next_step:
      "Behandla lungsjukdomen som orsak tills motsatsen är visad: NTM-odling, HRCT, strukturerad sekretmobilisering och energität kost med dietistkontakt. Väg en gång i veckan på samma våg och notera kaloriintag – utan den kurvan går det inte att avgöra om åtgärderna biter.",
    related_tests: ["HbA1c", "Albumin", "CRP"],
    action_match: ["Vikt", "dietist", "sekretmobilisering"],
    study_refs: ["bronkiektasi_ers_2017", "weightloss_occult_cancer", "ada_diagnosis_2026"],
  },
  {
    title: "Primär ciliär dyskinesi har aldrig övervägts – och passar bilden bättre än något annat",
    severity: "hög",
    why:
      "Bronkiektasier, kronisk rinosinuit sedan 16-årsåldern, daglig nästäppa, uttalad snarkning och recidiverande luftvägsinfektioner med H. influenzae och S. aureus. Det är PCD:s standardpresentation. De två differentialdiagnoser som brukar utredas först är redan avfärdade hos dig – svettklorid 9 utesluter cystisk fibros och normala immunglobuliner utesluter CVID – vilket gör PCD till den mest sannolika kvarvarande systemförklaringen. Ändå nämns den inte någonstans i materialet. Screening görs med nasalt kväveoxid: några minuters utandningsprov i näsan, kraftigt sänkt vid PCD.",
    next_step:
      "Remiss för nasalt kväveoxid. Ta samtidigt upp anamnesen som pekar mot PCD: upprepade öroninflammationer som barn, andningsstörning som nyfödd, situs inversus i familjen och eventuell nedsatt fertilitet.",
    related_tests: ["Svettklorid", "IgG", "IgA"],
    action_match: ["kväveoxid", "PCD", "nNO"],
    study_refs: ["pcd_ers_2017", "bronkiektasi_ers_2017", "bronkiektasi_registry_2017"],
  },
  {
    title: "Celiaki har aldrig testats trots 17 års typ 1-diabetes och pågående viktnedgång",
    severity: "hög",
    why:
      "Celiaki förekommer hos 5–16 % av personer med typ 1-diabetes, mot omkring 1 % i befolkningen, och en stor andel är symtomfattig. I 271 provsvar från åtta år finns inte ett enda tTG-IgA. Din total-IgA är normal vid tre tillfällen (2,0 / 2,2 / 1,5 g/L), så serologin är tolkbar utan förbehåll – det som annars är den vanligaste fällan. D-vitamin 58 nmol/L 2018, aldrig omkontrollerat, är ett svagt stöd för malabsorptionshypotesen.",
    next_step:
      "tTG-IgA med total-IgA i samma prov, under pågående glutenintag. Ta näringsstatus i samma stick: ferritin, B12, folat, 25-OH-vitamin D och zink.",
    related_tests: ["IgA", "Vitamin D (25-OH)", "Ferritin", "Vitamin B12"],
    action_match: ["tTG-IgA", "celiaki", "näringsstatus"],
    study_refs: ["celiaki_who_to_test", "ada_children_2026", "ada_comorbid_2026"],
  },
  {
    title: "Nytillkommen halsknöl april 2025 – aldrig bildutredd, och du går ned i vikt",
    severity: "hög",
    why:
      "Du noterade själv den 14 april 2025 en 0,8 cm stor knöl på höger halssida. Utöver den finns en knöl subklavikulärt som funnits sedan 20-årsåldern. Vårdcentralen noterade knölarna den 7 februari 2025, men i underlaget finns ingen bilddiagnostik, ingen punktion och ingen uppföljning. Reaktiv lymfkörtelsvullnad är den mest sannolika förklaringen hos någon med kroniska luftvägsinfektioner – men kombinationen ny lymfkörtel och ofrivillig viktnedgång ska aldrig lämnas outredd.",
    next_step:
      "Ultraljud hals, med finnålspunktion om körteln ser patologisk ut. Hör samtidigt efter nattsvettningar och feber utan infektionsfokus – de finns med i den dagliga checklistan.",
    related_tests: ["LPK", "Lymfocyter", "LD"],
    action_match: ["Ultraljud hals", "lymfkörtel", "knöl"],
    study_refs: ["weightloss_cancer_bmj", "weightloss_occult_cancer"],
  },
  {
    title: "Östradiol 207 med erektil dysfunktion – hCG är aldrig taget",
    severity: "hög",
    why:
      "Östradiol 207 pmol/L mot ett övre referensvärde kring 160, med normalt testosteron (28 nmol/L), normalt LH (2,1) och normalt SHBG (54). Hos en 28-årig man med samtidig erektil dysfunktion och viktnedgång är hCG-producerande testikeltumör den diagnos som inte får missas – och den skulle kunna knyta ihop hormonfyndet med viktnedgången. De vanligare förklaringarna är läkemedel, leverpåverkan och analysfel. ASAT var 1,13 µkat/L i juni 2025 med normalt ALAT, och hade normaliserats till 0,60 i januari 2026.",
    next_step:
      "hCG, prolaktin och omprov av östradiol, plus testikelpalpation med ultraljud vid minsta oklarhet. Be labbet bekräfta fritt testosteron 11 – enheten nmol/L är sannolikt fel, värdet ser ut att höra hemma i pmol/L.",
    related_tests: ["Östradiol", "Testosteron", "LH", "SHBG", "ASAT"],
    action_match: ["hCG", "östradiol", "testikel"],
    study_refs: ["gynekomasti_nejm_2007", "weightloss_occult_cancer"],
  },
  {
    title: "Bronkiektasierna saknar basbehandling – luftrörsvidgande löser inte sekretproblemet",
    severity: "hög",
    why:
      "Behandlingen består i underlaget av Anoro, tidigare Atrovent och numera Oxis, det vill säga enbart luftrörsvidgande. Vid bronkiektasier är grundproblemet sekretstagnation, och basbehandlingen är daglig sekretmobilisering med PEP och fysioterapeutiskt inlärd teknik – det är den åtgärd som minskar exacerbationer. Ingenstans i materialet finns fysioterapikontakt, sekretmobilisering, vaccinationsstatus eller en skriven exacerbationsplan. Journalen från 13 februari 2025 säger uttryckligen att slembesvären kvarstod dagligen trots Anoro och Atrovent, vilket är precis vad man ska vänta sig.",
    next_step:
      "Remiss till fysioterapeut för sekretmobiliseringsteknik. Kontrollera vaccinationsstatus för pneumokocker, influensa och covid. Skriv en exacerbationsplan med stående antibiotikarecept, baserad på odlingssvar i stället för gissning.",
    related_tests: ["CRP", "LPK"],
    action_match: ["fysioterapi", "sekretmobilisering", "vaccination", "exacerbationsplan"],
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_bts_2019", "bronkiektasi_registry_2017"],
  },
  {
    title: "Normalt total-IgG utesluter inte specifik antikroppsbrist",
    severity: "medel",
    why:
      "IgG 11, 11,9 och 12,0 g/L vid tre tillfällen utesluter CVID – det är ett verkligt och användbart besked. Men specifik antikroppsbrist och IgG-subklassbrist ger samma kliniska bild med normalt total-IgG: recidiverande sinopulmonella infektioner med kapslade bakterier, exakt de H. influenzae och S. aureus som odlats fram hos dig. De diagnoserna ställs bara genom att mäta antikroppssvar efter pneumokockvaccination.",
    next_step:
      "Pneumokockantikroppar före och efter vaccination samt IgG-subklasser 1–4. Notera att budesonid och tidigare kortisonbehandling kan sänka IgG – ange aktuell dos på remissen.",
    related_tests: ["IgG", "IgA", "IgM"],
    action_match: ["vaccinationssvar", "subklasser", "pneumokock"],
    study_refs: ["iei_practice_parameter_2025", "cvid_systematic_review", "cvid_dissection"],
  },
  {
    title: "Pseudomonas är aldrig eftersökt systematiskt",
    severity: "medel",
    why:
      "Odlingar har tagits när något hänt – bronkoskopin i januari 2025 och sputum i februari 2025 – men det finns ingen regelbunden övervakning. Kronisk Pseudomonaskolonisering är den enskilt viktigaste prognostiska faktorn vid bronkiektasier, och nyupptäckt växt går ofta att eradikera medan kronisk kolonisering inte gör det. Tidsfönstret är kort, vilket är hela skälet att odla enligt schema i stället för vid symtom.",
    next_step:
      "Sputumodling var tredje till sjätte månad, och alltid vid exacerbation. Bygg upp ett resistensmönster som antibiotikavalet kan vila på.",
    related_tests: [],
    action_match: ["Pseudomonas", "rutinodling"],
    study_refs: ["bronkiektasi_ers_2017", "bronkiektasi_bts_2019"],
  },
  {
    title: "HbA1c stiger 40 → 49 på arton månader, och 5 % av tiden ligger under 3,9",
    severity: "medel",
    why:
      "Juli 2024 var HbA1c 40 mmol/mol – den bästa kontrollen i hela materialet. Sedan 45 i juni 2025, 48 i november och 49 i januari 2026. Fortfarande under behandlingsmålet, men trenden är entydig och riktningen är fel. Samtidigt visar CGM 6–19 april 2026 att 4 % av tiden ligger 3,0–3,8 mmol/L och 1 % under 3,0, med standardavvikelse 3,1 – hög variabilitet. Dina egna anteckningar visar samma sak: kolhydratkvoten har pendlat mellan 1:12 och 1:13 utan att landa, och vid padel räckte det inte att sänka basalen.",
    next_step:
      "Ta upp kvoten och en aktivitetsstrategi vid nästa besök på Centrum för diabetes. Att stänga av pumpen och äta kolhydrater i förväg fungerade enligt din anteckning från 18 april – bygg vidare på det i stället för att bara justera basalen.",
    related_tests: ["HbA1c", "P-Glukos"],
    action_match: ["HbA1c", "kolhydratkvot", "CGM"],
    study_refs: ["ada_diagnosis_2026", "t1d_jama_2026", "t1d_lancet_2023"],
  },
  {
    title: "Kreatinin och eGFR pendlar utan förklaring",
    severity: "medel",
    why:
      "Kreatinin 107 µmol/L med eGFR 73 i januari 2026, mot 90 och eGFR 86 ett halvår tidigare. Serien sedan 2019: 111 → 105 → 83 → 94 → 97 → 99 → 90 → 107. Albuminuri saknas genomgående, vilket talar emot diabetesnefropati. Kreatinin påverkas av muskelmassa, proteinintag och vätskestatus, och en pågående viktnedgång rör om i just de faktorerna. Cystatin C mättes en gång, 2024, och gav eGFR 88.",
    next_step:
      "Omkontroll med både kreatinin och cystatin C samt U-albumin/kreatinin. Blir NTM- eller Pseudomonasbehandling aktuell behöver njurfunktionen vara kartlagd innan – flera av de aktuella antibiotika är nefrotoxiska.",
    related_tests: ["Kreatinin", "eGFR", "Cystatin C", "U-Alb/Krea-kvot"],
    action_match: ["Kreatinin", "cystatin", "njurfunktion"],
    study_refs: ["ada_comorbid_2026"],
  },
  {
    title: "DT bihålor planerades april 2025 – något svar finns inte",
    severity: "medel",
    why:
      "Dr Karin Toll på Karolinska ÖNH satte diagnosen kronisk rinosinuit den 17 april 2025, ändrade behandlingen till budesonidsköljning morgon och kväll, och planerade en skiktröntgen av bihålorna. I underlaget finns varken svar eller uppgift om att undersökningen genomförts. Två ÖNH-läkare har dessutom gjort olika bedömningar: Sergelkliniken den 24 mars fann rakt septum utan polyper och avfärdade kronisk sinuit, medan Karolinska tre veckor senare ställde just den diagnosen.",
    next_step:
      "Efterhör den planerade undersökningen. Utbredd pansinuit skulle stärka PCD-misstanken påtagligt och även visa om bihålorna fungerar som bakteriereservoar för luftvägarna.",
    related_tests: [],
    action_match: ["DT bihålor", "rinosinuit"],
    study_refs: ["rinosinuit_epos_2020", "pcd_ers_2017"],
  },
];

// ---------------------------------------------------------------------------
// Behandlingsplan – åtgärder, inte prover
// ---------------------------------------------------------------------------

export const TREATMENT_PLAN = [
  {
    icon: "activity",
    action: "Daglig sekretmobilisering",
    details: "PEP och huffing morgon och kväll, teknik inlärd av fysioterapeut. Basbehandlingen vid bronkiektasier – luftrörsvidgande ersätter den inte.",
    ref: "ERS 2017 / BTS 2019",
    color: "text-rose-400",
  },
  {
    icon: "syringe",
    action: "Kontrollera vaccinationsstatus",
    details: "Pneumokocker, influensa årligen och covid. Vaccinationssvaret används dessutom i utredningen av specifik antikroppsbrist.",
    ref: "ERS 2017",
    color: "text-violet-400",
  },
  {
    icon: "shield",
    action: "Skriv en exacerbationsplan",
    details: "Stående recept och tydliga kriterier för när kuren startas. Antibiotikavalet ska styras av odlingssvar, inte gissning som vid Doxyferm och Trim-Sulfa 2025.",
    ref: "BTS 2019",
    color: "text-amber-400",
  },
  {
    icon: "pill",
    action: "Makrolidprofylax – först efter NTM-svar",
    details: "Azitromycin tre gånger per vecka minskar exacerbationer vid bronkiektasier. Får inte startas innan mykobakterieodlingen är negativ: monoterapi vid odiagnostiserad NTM ger makrolidresistens.",
    ref: "BAT / JAMA 2013",
    color: "text-red-400",
  },
  {
    icon: "heart",
    action: "Energität kost och dietistkontakt",
    details: "Viktnedgången är en behandlingsindikation i sig vid kronisk lungsjukdom. Väg en gång i veckan på samma våg och notera kaloriintag.",
    ref: "Klinisk uppföljning",
    color: "text-teal-400",
  },
  {
    icon: "eye",
    action: "Fortsatt nässköljning med budesonid",
    details: "Morgon och kväll enligt ordination från Karolinska ÖNH. Ange dosen om immunologisk utredning görs – kortison kan sänka IgG.",
    ref: "EPOS 2020",
    color: "text-cyan-400",
  },
  {
    icon: "flask",
    action: "Sputumodling enligt schema",
    details: "Var tredje till sjätte månad samt vid varje exacerbation. Nyupptäckt Pseudomonas ska eradikeras medan tidsfönstret finns kvar.",
    ref: "ERS 2017",
    color: "text-orange-400",
  },
  {
    icon: "pill",
    action: "Ompröva luftrörsvidgande behandlingen",
    details: "Anoro och Oxis parallellt utan dokumenterad reversibilitet. Gör reversibilitetstest innan behandlingen byggs på ytterligare.",
    ref: "Spirometri feb 2025",
    color: "text-blue-400",
  },
  {
    icon: "droplet",
    action: "Stabilisera kolhydratkvoten",
    details: "1:12 gav hypoglykemi, 1:13 gav höga värden efter måltid. Ta med CGM-utskriften till Centrum för diabetes i stället för att justera i efterhand.",
    ref: "CGM april 2026",
    color: "text-emerald-400",
  },
];

// ---------------------------------------------------------------------------
// Bilddiagnostik och utredningsfynd
// ---------------------------------------------------------------------------

export const IMAGING_FINDINGS = [
  {
    id: "bronkoskopi_2025",
    icon: "activity",
    organ: "Luftvägar",
    date: "2025-01-07",
    clinic: "Lung- och allergimottagningen",
    grade: "moderate",
    title: "Gulaktiga slemklumpar bilateralt, växt av Haemophilus influenzae",
    detail: "Bronkoskopi genomförd på grund av tilltagande lungförändringar. Fynd av gulaktiga slemklumpar på båda sidor. Odlingen visade Haemophilus influenzae och behandlades med Doxyferm i 14 dagar. Purulent sekret bilateralt är typiskt för bronkiektasier med kronisk bakteriell kolonisering.",
    metric: "H. influenzae",
  },
  {
    id: "spirometri_2025",
    icon: "activity",
    organ: "Lungfunktion",
    date: "2025-02-13",
    clinic: "Lung- och allergimottagningen",
    grade: "mild",
    title: "Lätt obstruktivitet, i övrigt normala lungvolymer",
    detail: "FEV1/FVC 0,72, vilket motsvarar lätt obstruktivitet. Lungvolymerna i övrigt normala. Reversibilitetstest och diffusionskapacitet saknas i underlaget, trots pågående behandling med både LAMA och LABA.",
    metric: "FEV1/FVC 0,72",
  },
  {
    id: "sputum_2025",
    icon: "microscope",
    organ: "Luftvägar",
    date: "2025-02-17",
    clinic: "Lung- och allergimottagningen",
    grade: "moderate",
    title: "Staphylococcus aureus i sputum",
    detail: "Sputumodlingen visade växt av Staphylococcus aureus, en dryg månad efter H. influenzae vid bronkoskopin. Behandlades med Trim-Sulfa i två veckor. Två olika patogener på fem veckor talar för en luftväg som inte klarar av att hålla sig steril.",
    metric: "S. aureus",
  },
  {
    id: "lungrontgen_2025",
    icon: "eye",
    organ: "Lungor",
    date: "2025-02-17",
    clinic: "Lung- och allergimottagningen",
    grade: "mild",
    title: "Partiell förbättring av lungförändringarna",
    detail: "Slätröntgen visade partiell regress efter antibiotikabehandlingen. Slätröntgen är dock otillräcklig för att bedöma bronkiektasiernas utbredning – HRCT saknas i underlaget.",
    metric: "Partiell regress",
  },
  {
    id: "svettest_2019",
    icon: "flask",
    organ: "Svettkörtlar",
    date: "2019-11-11",
    clinic: "Cystisk fibros-mottagningen",
    grade: "normal",
    title: "Svettklorid 9 mmol/L – cystisk fibros utesluten",
    detail: "Under 30 mmol/L talar emot cystisk fibros, 30–59 är intermediärt och 60 eller mer är diagnostiskt. Värdet 9 ligger långt under gränsen och utesluter klassisk CF. Det är en av två differentialdiagnoser som därmed är avklarad – den andra är antikroppsbrist.",
    metric: "9 mmol/L",
  },
  {
    id: "rhinoskopi_2025",
    icon: "eye",
    organ: "Näsa och bihålor",
    date: "2025-03-24",
    clinic: "Sergelkliniken ÖNH",
    grade: "normal",
    title: "Rakt septum, inga polyper",
    detail: "Undersökningen visade rakt nässeptum utan polyper. Läkaren bedömde att det inte förelåg kronisk sinuit som orsak till lungbesvären och satte in Ryaltris. Bedömningen skiljer sig från Karolinskas tre veckor senare.",
    metric: "Inga polyper",
  },
  {
    id: "onh_karolinska_2025",
    icon: "stethoscope",
    organ: "Näsa och bihålor",
    date: "2025-04-17",
    clinic: "Karolinska ÖNH",
    grade: "mild",
    title: "Kronisk rinosinuit – behandling ändrad, DT planerad",
    detail: "Diagnosen kronisk rinosinuit ställdes och behandlingen ändrades till budesonidsköljning morgon och kväll. En skiktröntgen av bihålorna planerades men något svar finns inte i underlaget. Bedömningen att näsbesvären inte orsakar lungproblemen är rimlig – men vid PCD orsakar de inte varandra, de har en gemensam orsak.",
    metric: "DT ej genomförd",
  },
  {
    id: "dermicus_2025",
    icon: "eye",
    organ: "Hud",
    date: "2025-02-10",
    clinic: "Sundbybergs Vårdcentral",
    grade: "normal",
    title: "Två leverfläckar bedömda via Dermicus – ingen åtgärd",
    detail: "Leverfläckar på höger axel och vänster rygg fotograferades och bedömdes via Dermicus. Svar via 1177: ingen åtgärd behövdes.",
    metric: "Ingen åtgärd",
  },
];

export const IMAGING_SUMMARY =
  "Två saker är avklarade och ska inte göras om: svettklorid 9 mmol/L utesluter cystisk fibros, och normala immunglobuliner vid tre tillfällen utesluter CVID. Det som saknas är HRCT thorax – bronkiektasiernas utbredning är aldrig kvantifierad, bara beskriven som tilltagande i januari 2025 och partiellt förbättrad i februari. Mykobakterieodling har aldrig tagits, och DT bihålor planerades i april 2025 utan att något svar finns.";

// ---------------------------------------------------------------------------
// Viktiga hållpunkter – resonemang som är värda att komma ihåg
// ---------------------------------------------------------------------------

export const CLINICAL_NOTES = [
  {
    id: "note_makrolid",
    date: "Säkerhetsnotering",
    title: "Makrolidprofylax får inte startas innan mykobakterieodlingen är negativ",
    body:
      "Azitromycin tre gånger per vecka är en väletablerad profylax vid bronkiektasier med upprepade exacerbationer och skulle vara ett rimligt nästa steg för dig.\n\nMen om det samtidigt finns en odiagnostiserad NTM-infektion innebär azitromycin i praktiken monoterapi mot mykobakterierna – och makrolidresistens utvecklas snabbt. Makroliden är den viktigaste komponenten i NTM-behandling, så resistensen tas med in i en behandling som annars pågår i över ett år.",
    matters:
      "Ordningen är alltså inte förhandlingsbar: odling först, profylax sedan. Det är också skälet att mykobakterieodlingen ligger som prov nummer ett och inte längre ner i listan.",
    tags: ["Bronkiektasier", "NTM", "Läkemedelssäkerhet"],
  },
  {
    id: "note_uteslutet",
    date: "Genomgång av 271 provsvar",
    title: "Vad de befintliga proverna redan har svarat på",
    body:
      "Svettklorid 9 mmol/L (2019) utesluter cystisk fibros.\nIgG 11 / 11,9 / 12,0 med normala IgA och IgM (2019 och 2025) utesluter CVID.\nAlfa-1-antitrypsin 1,2–1,3 g/L utesluter alfa-1-antitrypsinbrist.\nTSH 2,2 och fritt T4 20 (2026) utesluter hypertyreos.\nHb 154–170 och ferritin 84–187 utesluter anemi och järnbrist.\nU-albumin/kreatinin 0,2–0,6 genomgående talar emot diabetesnefropati.\nHbA1c 40–49 och CGM med GMI 50,3 gör glukosuri till en osannolik viktförklaring.",
    matters:
      "Det här är den mest värdefulla delen av materialet, för det talar om vad som INTE ska beställas igen. Två förbehåll: normalt total-IgG utesluter inte specifik antikroppsbrist, som kräver vaccinationssvar, och normalt svettest utesluter inte CFTR-relaterad sjukdom helt – men gör den osannolik.",
    tags: ["Utredning", "Vad som är klart"],
  },
  {
    id: "note_referensintervall",
    date: "Metodnotering",
    title: "Laboratorierna använder olika referensintervall",
    body:
      "Werlabs flaggade 2018 fritt T4 17 pmol/L som lätt förhöjt, kalcium 2,56 och B12 476 som lätt förhöjda. Ekerö Vårdcentral markerade i december 2018 fritt T4 som utanför sitt intervall 7,6–16.\n\nPå den här sidan används genomgående ett intervall per analys – för fritt T4 12–22 pmol/L – vilket gör att 2018 års värde visas som normalt. Senare kontroller (18, 19, 20 pmol/L) har bedömts normala av respektive laboratorium.\n\nHbA1c visas mot 27–52 mmol/mol, alltså behandlingsmålet vid typ 1-diabetes, inte friskintervallet. Annars skulle varje värde du någonsin haft flaggas rött.",
    matters:
      "Ett värde som är rött hos ett laboratorium och grönt hos ett annat säger mer om intervallen än om dig. Jämför alltid inom samma laboratorium när du tolkar en trend.",
    tags: ["Provsvar", "Tolkning"],
  },
  {
    id: "note_fritt_testosteron",
    date: "Sannolikt analysfel",
    title: "Fritt testosteron 11 nmol/L – enheten stämmer inte",
    body:
      "Fritt testosteron utgör normalt cirka 1–2 % av det totala. Med totalt testosteron 28 nmol/L skulle fritt testosteron ligga kring 0,3–0,6 nmol/L, alltså ungefär 300–600 pmol/L.\n\nVärdet 11 är därför orimligt högt om enheten verkligen är nmol/L, men fullt rimligt om provsvaret egentligen avser pmol/L eller en annan beräkningsmetod.",
    matters:
      "Kontrollera enheten med laboratoriet innan värdet används för något beslut. Det som däremot inte går att bortförklara är östradiol 207 pmol/L – det värdet står oemotsagt och är det som motiverar hCG-provet.",
    tags: ["Hormon", "Analysfel"],
  },
  {
    id: "note_antibiotika",
    date: "2025",
    title: "Antibiotikahistorik 2025 – fyra kurer på tre månader",
    body:
      "Doxyferm 14 dagar i januari efter H. influenzae vid bronkoskopin.\nTrim-Sulfa 14 dagar i februari efter S. aureus i sputum.\nTerracortril med polymyxin B lokalt i februari mot paronyki på höger stortå.\nHeracillin 10 dagar i april när paronykin inte läkte på lokalbehandling.",
    matters:
      "Fyra kurer på tre månader hos en 28-åring är i sig ett utredningsskäl. Att paronykin krävde peroral antibiotika efter utebliven effekt av lokalbehandling är också värt att notera – hudinfektioner som inte läker hör snarare ihop med blodsockerkontrollen än med luftvägarna, men båda spåren finns hos dig samtidigt.",
    tags: ["Infektioner", "Antibiotika"],
  },
  {
    id: "note_onh_oenighet",
    date: "Mars–april 2025",
    title: "Två ÖNH-läkare gjorde olika bedömningar med tre veckors mellanrum",
    body:
      "Sergelkliniken den 24 mars: rakt septum, inga polyper, ingen kronisk sinuit som orsakar lungbesvären. Ryaltris förskrevs.\n\nKarolinska den 17 april: diagnosen kronisk rinosinuit ställdes, behandlingen ändrades till budesonidsköljning och DT bihålor planerades.",
    matters:
      "Skillnaden spelar roll för PCD-frågan. Både lungorna och bihålorna drivs vid PCD av samma defekt – de orsakar inte varandra, de har en gemensam orsak. Att den ena läkaren avfärdade sambandet och den andra ställde diagnosen gör att DT-svaret behövs för att avgöra saken.",
    tags: ["ÖNH", "PCD"],
  },
];

// ---------------------------------------------------------------------------
// Sjukdomsförloppet i kondenserad form
// ---------------------------------------------------------------------------

/** kind: "händelse" | "utredning" | "operation" | "beslut" | "lucka" */
export const VASCULAR_TIMELINE = [
  {
    date: "2018-09",
    kind: "utredning",
    title: "Första provsvaren i materialet – HbA1c 62, lågt D-vitamin",
    actors: "Lars André · Werlabs",
    text: "HbA1c 62 mmol/mol och P-glukos 12,0 med rekommendation att ta upp saken med diabetessköterskan. Lätt förhöjt hs-CRP 12,5. D-vitamin 58 nmol/L – det värdet har aldrig kontrollerats om.",
  },
  {
    date: "2019-08 – 2019-09",
    kind: "utredning",
    title: "Bred utredning: immunglobuliner, elfores, koagulation – allt normalt",
    actors: "Stenhamra Hälsocentral · Lung- och allergimottagningen",
    text: "IgG 11 och 11,9, IgA 2,0 och 2,2, IgM 0,96 och 0,92 – normala. Alfa-1-antitrypsin 1,3 och 1,2. Kortisol 491. SR 2. Kreatinin 111 med eGFR 69 i augusti, vilket var första gången njurfunktionen avvek.",
  },
  {
    date: "2019-11-11",
    kind: "utredning",
    title: "Svettest normalt – cystisk fibros utesluten",
    actors: "Cystisk fibros-mottagningen",
    text: "Svettklorid 9 mmol/L, långt under gränsen 30. Den mest närliggande förklaringen till bronkiektasier hos en ung person var därmed borta – men någon alternativ systemdiagnos söktes aldrig vidare.",
  },
  {
    date: "2020 – 2024",
    kind: "lucka",
    title: "Fyra år med glest provtagande och ingen strukturerad lungutredning",
    actors: "",
    text: "HbA1c 62 i juli 2020, sedan inget förrän 2024 då det var nere i 40 – den bästa kontrollen i materialet. Kreatinin 105 med eGFR 73 år 2020, normaliserat till 83 år 2021. Under samma period finns ingen uppföljning av bronkiektasierna.",
  },
  {
    date: "2024-08-28",
    kind: "händelse",
    title: "Exacerbation med CRP 25 och LPK 10,6",
    actors: "Lung- och allergimottagningen",
    text: "Det enda tillfället i hela materialet med tydligt förhöjda inflammationsmarkörer: LPK 10,6, neutrofila 7,8, monocyter 1,2 och CRP 25 mg/L. Eosinofila under 0,1, vilket talar emot ABPA.",
  },
  {
    date: "2025-01-07",
    kind: "utredning",
    title: "Bronkoskopi vid tilltagande lungförändringar – H. influenzae",
    actors: "Lung- och allergimottagningen",
    text: "Gulaktiga slemklumpar på båda sidor. Odling visade Haemophilus influenzae. Doxyferm i 14 dagar. Ingen mykobakterieodling togs vid tillfället.",
  },
  {
    date: "2025-02-13 – 02-17",
    kind: "beslut",
    title: "Spirometri 0,72, S. aureus i sputum, Atrovent byts mot Oxis",
    actors: "Michael Runold · Lung- och allergimottagningen",
    text: "Dagliga slembesvär trots Anoro och Atrovent. FEV1/FVC 0,72. Sputumodlingen visade Staphylococcus aureus – den andra patogenen på fem veckor. Trim-Sulfa i två veckor och remiss till ÖNH.",
  },
  {
    date: "2025-02-27 – 04-01",
    kind: "händelse",
    title: "Paronyki höger stortå som krävde peroral antibiotika",
    actors: "Ada Wozniak · Sundbybergs Vårdcentral",
    text: "Svullen och smärtande stortå utan synligt var. Lokalbehandling med Terracortril och Alsolsprit räckte inte – Heracillin i 10 dagar behövdes. Fjärde antibiotikakuren på tre månader.",
  },
  {
    date: "2025-03-24 – 04-17",
    kind: "beslut",
    title: "Två ÖNH-bedömningar med olika slutsats",
    actors: "Balcarras Crafoord · Sergelkliniken / Karin Toll · Karolinska",
    text: "Sergelkliniken fann rakt septum utan polyper och avfärdade kronisk sinuit. Karolinska ställde tre veckor senare diagnosen kronisk rinosinuit, ändrade till budesonidsköljning och planerade DT bihålor.",
  },
  {
    date: "2025-04-14",
    kind: "lucka",
    title: "Ny knöl på halsen – aldrig utredd",
    actors: "Egen anteckning",
    text: "0,8 cm på höger halssida, ungefär en och en halv centimeter nedanför en finne. Vårdcentralen hade noterat knölar på halsen och subklavikulärt redan i februari. Ingen bilddiagnostik, ingen punktion, ingen uppföljning finns i materialet.",
  },
  {
    date: "2025-06-03",
    kind: "utredning",
    title: "Immunglobuliner normala igen, ASAT 1,13",
    actors: "Lung- och allergimottagningen",
    text: "IgG 12,0, IgA 1,5, IgM 0,98 – CVID definitivt uteslutet. CRP under 1 och hs-CRP 0,89, alltså ingen pågående systemisk inflammation. ASAT 1,13 µkat/L med normalt ALAT 0,70 sticker ut och normaliserades senare.",
  },
  {
    date: "2025-11 – 2026-01",
    kind: "händelse",
    title: "HbA1c stiger till 49, kreatinin 107",
    actors: "Centrum för diabetes",
    text: "HbA1c 48 i november och 49 i januari, från 40 i juli 2024. Kreatinin 107 med eGFR 73 – den lägsta njurfunktionen sedan 2020. Ingen albuminuri.",
  },
  {
    date: "2026-02",
    kind: "lucka",
    title: "Östradiol 207 – ingen uppföljning",
    actors: "Testmottagningen / Werlabs",
    text: "Förhöjt östradiol med normalt testosteron, LH och SHBG, hos en man med erektil dysfunktion och pågående viktnedgång. hCG är aldrig taget. Fritt testosteron rapporterades som 11 nmol/L, vilket sannolikt är fel enhet.",
  },
  {
    date: "2026-04",
    kind: "händelse",
    title: "CGM: 74 % tid i målområde men 5 % hypoglykemi",
    actors: "Egna anteckningar · Dexcom G7",
    text: "GMI 50,3 mmol/mol, standardavvikelse 3,1. Kolhydratkvoten pendlade mellan 1:12 och 1:13 utan att landa. Vid padel räckte det inte att sänka basalen – att stänga av pumpen och äta kolhydrater i förväg fungerade bättre.",
  },
];

// ---------------------------------------------------------------------------
// Evidenssök – kunskapsbank som AI-svaren resonerar utifrån
// ---------------------------------------------------------------------------

export const DISEASE_CATEGORIES = [
  { key: "alla", label: "Alla", icon: "book", color: "bg-primary text-white" },
  { key: "bronkiektasi", label: "Bronkiektasier", icon: "activity", color: "bg-rose-500/15 text-rose-400" },
  { key: "pcd", label: "PCD / Cilier", icon: "microscope", color: "bg-sky-500/15 text-sky-400" },
  { key: "ntm", label: "NTM / Infektion", icon: "shield", color: "bg-red-500/15 text-red-400" },
  { key: "diabetes", label: "Typ 1-diabetes", icon: "droplet", color: "bg-orange-500/15 text-orange-400" },
  { key: "celiaki", label: "Celiaki / Tarm", icon: "layers", color: "bg-amber-500/15 text-amber-400" },
  { key: "immunbrist", label: "Immunbrist", icon: "shield", color: "bg-violet-500/15 text-violet-400" },
  { key: "hormon", label: "Hormon", icon: "heart", color: "bg-pink-500/15 text-pink-400" },
  { key: "malignitet", label: "Viktnedgång / Malignitet", icon: "stethoscope", color: "bg-emerald-500/15 text-emerald-400" },
  { key: "ärftlighet", label: "Ärftlighet / Genetik", icon: "dna", color: "bg-fuchsia-500/15 text-fuchsia-400" },
];

export const EVIDENCE_CORPUS = [
  // --- Bronkiektasier ------------------------------------------------------
  {
    id: "bronkiektasi_ers_2017",
    type: "evidence",
    icon: "activity",
    short: "ERS 2017",
    title: "Bronkiektasier hos vuxna – europeisk riktlinje för utredning och behandling",
    tag: "ERS Guideline",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi", "ntm", "pcd"],
    summary:
      "European Respiratory Societys riktlinje för handläggning av bronkiektasier hos vuxna. Två saker är centrala här. Det ena är den etiologiska minimiutredningen som alla patienter ska genomgå: immunglobuliner, test för cystisk fibros, ABPA-screening och – vid rätt klinik – utredning för primär ciliär dyskinesi. Det andra är att basbehandlingen består av daglig sekretmobilisering och behandling av bakteriell kolonisering, inte av luftrörsvidgande läkemedel. Riktlinjen betonar också regelbunden sputumodling med särskild uppmärksamhet på Pseudomonas aeruginosa, där tidig eradikering är möjlig men tidsfönstret kort.",
    source: "Polverino E, Goeminne PC, McDonnell MJ, et al. European Respiratory Society guidelines for the management of adult bronchiectasis. Eur Respir J. 2017;50(3):1700629",
    sourceUrl: "https://doi.org/10.1183/13993003.00629-2017",
  },
  {
    id: "bronkiektasi_bts_2019",
    type: "evidence",
    icon: "list",
    short: "BTS 2019",
    title: "British Thoracic Society – bronkiektasier hos vuxna",
    tag: "BTS Guideline",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi", "ntm"],
    summary:
      "Brittisk riktlinje som kompletterar den europeiska med mer detaljerade praktiska rekommendationer: HRCT som diagnostisk standard, strukturerad sekretmobilisering med fysioterapeut, vaccinationer, exacerbationsplan med tidig antibiotikastart, och långtidsprofylax med makrolid vid upprepade exacerbationer. Här finns också den uttryckliga säkerhetsspärren att mykobakterieodling ska vara negativ innan makrolidprofylax inleds, eftersom monoterapi vid odiagnostiserad NTM ger makrolidresistens.",
    source: "Hill AT, Sullivan AL, Chalmers JD, et al. British Thoracic Society Guideline for bronchiectasis in adults. Thorax. 2019;74(Suppl 1):1–69",
    sourceUrl: "https://doi.org/10.1136/thoraxjnl-2018-212463",
  },
  {
    id: "bronkiektasi_registry_2017",
    type: "evidence",
    icon: "layers",
    short: "Aksamit 2017",
    title: "Vad ligger bakom bronkiektasier – registerdata från vuxna patienter",
    tag: "Chest 2017 · registerstudie",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi", "ntm", "pcd"],
    summary:
      "Genomgång av den första större kohorten i det amerikanska bronkiektasiregistret. Studien visar hur orsaksfördelningen faktiskt ser ut i klinisk verklighet: en stor andel förblir idiopatiska, en betydande grupp har genomgången infektion som utlösande faktor, och immunbrist, ciliedefekt och ABPA utgör vardera en mindre men viktig del. Icke-tuberkulösa mykobakterier var vanligt förekommande i kohorten. Slutsatsen som är relevant här är att idiopatisk klassificering ofta betyder ofullständigt utredd snarare än verkligen okänd orsak.",
    source: "Aksamit TR, O'Donnell AE, Barker A, et al. Adult Patients With Bronchiectasis: A First Look at the US Bronchiectasis Research Registry. Chest. 2017;151(5):982–992",
    sourceUrl: "https://doi.org/10.1016/j.chest.2016.10.055",
  },
  {
    id: "makrolid_bat_2013",
    type: "evidence",
    icon: "shield",
    short: "BAT 2013",
    title: "Azitromycin som underhållsbehandling minskar exacerbationer",
    tag: "JAMA 2013 · randomiserad studie",
    tagColor: "bg-amber-500/15 text-amber-400",
    diseases: ["bronkiektasi", "ntm"],
    summary:
      "Randomiserad, placebokontrollerad studie av azitromycin som underhållsbehandling vid bronkiektasier utan cystisk fibros. Behandlingen minskade antalet infektiösa exacerbationer tydligt, vilket gjort makrolidprofylax till standardalternativ vid upprepade försämringar. Priset är resistensutveckling hos luftvägsfloran – och därför förutsätter behandlingen att mykobakterieinfektion är utesluten först, eftersom makroliden annars ges som monoterapi mot NTM och den viktigaste behandlingskomponenten går förlorad.",
    source: "Altenburg J, de Graaff CS, Stienstra Y, et al. Effect of azithromycin maintenance treatment on infectious exacerbations among patients with non-cystic fibrosis bronchiectasis: the BAT randomized controlled trial. JAMA. 2013;309(12):1251–1259",
    sourceUrl: "https://doi.org/10.1001/jama.2013.1937",
  },

  // --- PCD -----------------------------------------------------------------
  {
    id: "pcd_ers_2017",
    type: "evidence",
    icon: "microscope",
    short: "PCD ERS 2017",
    title: "Primär ciliär dyskinesi – diagnostik med nasalt kväveoxid som första steg",
    tag: "ERS Guideline",
    tagColor: "bg-sky-500/15 text-sky-400",
    diseases: ["pcd", "bronkiektasi"],
    summary:
      "European Respiratory Societys riktlinje för diagnostik av primär ciliär dyskinesi. Sjukdomen ger nedsatt ciliefunktion i både nedre och övre luftvägar, vilket ger bronkiektasier, kronisk rinosinuit, sekretorisk mediaotit och ofta nedsatt fertilitet – och i ungefär hälften av fallen situs inversus. Nasalt kväveoxid är förstahandsundersökningen: enkel, icke-invasiv och kraftigt sänkt vid PCD. Ett lågt värde följs av högfrekvent videomikroskopi av ciliernas rörelse och genetisk testning. Riktlinjen understryker att diagnosen ofta ställs sent hos vuxna, eftersom besvären avfärdas som astma eller kronisk bihåleinflammation var för sig i stället för att ses som en gemensam mekanism.",
    source: "Lucas JS, Barbato A, Collins SA, et al. European Respiratory Society guidelines for the diagnosis of primary ciliary dyskinesia. Eur Respir J. 2017;49(1):1601090",
    sourceUrl: "https://doi.org/10.1183/13993003.01090-2016",
  },

  // --- NTM -----------------------------------------------------------------
  {
    id: "ntm_ats_2020",
    type: "evidence",
    icon: "shield",
    short: "NTM ATS/IDSA 2020",
    title: "Icke-tuberkulösa mykobakterier i lungorna – diagnostik och behandling",
    tag: "ATS/ERS/ESCMID/IDSA 2020",
    tagColor: "bg-red-500/15 text-red-400",
    diseases: ["ntm", "bronkiektasi"],
    summary:
      "Gemensam internationell riktlinje för lungsjukdom orsakad av icke-tuberkulösa mykobakterier. Diagnosen kräver kliniska symtom, radiologiska fynd och mikrobiologisk bekräftelse – i praktiken minst två positiva sputumodlingar från separata tillfällen, vilket är skälet att tre morgonprov beställs. Bronkiektasier är både riskfaktor och konsekvens, och kroniska symtom med viktnedgång är typiska. Behandlingen är kombinationsterapi med makrolid som ryggrad under minst tolv månader efter negativ odling, vilket gör makrolidresistens till ett allvarligt problem och förklarar varför profylaktisk azitromycin inte får ges innan NTM är uteslutet.",
    source: "Daley CL, Iaccarino JM, Lange C, et al. Treatment of Nontuberculous Mycobacterial Pulmonary Disease: An Official ATS/ERS/ESCMID/IDSA Clinical Practice Guideline. Clin Infect Dis. 2020;71(4):e1–e36",
    sourceUrl: "https://doi.org/10.1093/cid/ciaa241",
  },

  // --- Cystisk fibros / CFTR ----------------------------------------------
  {
    id: "cf_diagnos_2017",
    type: "evidence",
    icon: "flask",
    short: "CF Foundation 2017",
    title: "Svettkloridets gränsvärden – hur ett normalt svettest ska tolkas",
    tag: "Konsensusriktlinje",
    tagColor: "bg-emerald-500/15 text-emerald-400",
    diseases: ["bronkiektasi", "pcd"],
    summary:
      "Konsensusriktlinje för diagnostik av cystisk fibros. Svettkloridet tolkas i tre nivåer: under 30 mmol/L talar emot CF, 30–59 mmol/L är intermediärt och kräver vidare utredning, och 60 mmol/L eller mer är diagnostiskt. Marcs värde 9 mmol/L från november 2019 ligger långt under den nedre gränsen och utesluter klassisk cystisk fibros. Riktlinjen noterar samtidigt att CFTR-relaterade tillstånd med mildare fenotyp kan förekomma vid normalt svettest, varför gensekvensering kvarstår som möjlighet om den kliniska bilden talar starkt för det trots normalt test.",
    source: "Farrell PM, White TB, Ren CL, et al. Diagnosis of Cystic Fibrosis: Consensus Guidelines from the Cystic Fibrosis Foundation. J Pediatr. 2017;181S:S4–S15.e1",
    sourceUrl: "https://doi.org/10.1016/j.jpeds.2016.09.064",
  },
  {
    id: "cftr_heterozygotes_2025",
    type: "evidence",
    icon: "dna",
    short: "Zeng 2025",
    title: "CFTR-heterozygoti ökar risken för astma, bronkiektasier och pneumoni",
    tag: "JAMA Intern Med 2025 · 317 964 deltagare",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi"],
    summary:
      "Stor populationsbaserad studie med 317 964 deltagare som undersökte om bärarskap av en enda CFTR-variant – alltså inte cystisk fibros – har kliniska konsekvenser. Heterozygoti var associerat med ökad risk för astma (OR 1,08), bronkiektasier (OR 1,21) och pneumokockpneumoni (OR 1,54). För Marcs del är detta det som gör att CFTR-frågan inte är helt stängd trots svettklorid 9 – men effekterna är små, och en enskild CFTR-variant förklarar inte en bild av den här omfattningen. Gensekvensering blir aktuell först om HRCT och nasalt kväveoxid inte ger något svar.",
    source: "Zeng C, Han ST, Cassini TA, et al. Diseases Common in Persons With Cystic Fibrosis Among CFTR Heterozygotes. JAMA Intern Med. 2025;185(8):1014–1024",
    sourceUrl: "https://doi.org/10.1001/jamainternmed.2025.1853",
  },
  {
    id: "cf_adult_diagnosis",
    type: "evidence",
    icon: "stethoscope",
    short: "Nick & Rodman 2005",
    title: "CF som upptäcks i vuxen ålder – ofta feldiagnostiserad som astma",
    tag: "Curr Opin Pulm Med",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi"],
    summary:
      "Genomgång av hur cystisk fibros ter sig när diagnosen ställs först i vuxen ålder: astmaliknande besvär, bronkiektasier, kronisk sinuit och recidiverande luftvägsinfektioner, ofta efter många år med enbart astmadiagnos. Poängen som är överförbar till Marc gäller inte CF i sig – svettestet är normalt – utan mönstret: när luftvägar och bihålor är sjuka samtidigt hos en ung person finns nästan alltid en gemensam underliggande mekanism, och den bör letas fram i stället för att organen behandlas var för sig.",
    source: "Nick JA, Rodman DM. Manifestations of Cystic Fibrosis Diagnosed in Adulthood. Curr Opin Pulm Med. 2005;11(6):513–518",
    sourceUrl: "https://doi.org/10.1097/01.mcp.0000183052.56728.76",
  },
  {
    id: "cf_lancet_2021",
    type: "evidence",
    icon: "book",
    short: "Shteinberg 2021",
    title: "Cystisk fibros – översikt inklusive CF-relaterad diabetes",
    tag: "Lancet Seminar",
    tagColor: "bg-rose-500/15 text-rose-400",
    diseases: ["bronkiektasi", "diabetes"],
    summary:
      "Bred översikt över cystisk fibros: genetik, diagnostik med svettest och gensekvensering, lungmanifestationer, pankreasinsufficiens och CF-relaterad diabetes. CF-relaterad diabetes är en av sjukdomens vanligaste extrapulmonella manifestationer och skiljer sig mekanistiskt från både typ 1 och typ 2. Hos Marc talar diabetesdebuten vid 11 års ålder och det normala svettestet emot den kopplingen, men översikten är fortsatt relevant som referens för hur luftvägssjukdom och diabetes kan höra ihop.",
    source: "Shteinberg M, Haq IJ, Polineni D, Davies JC. Cystic Fibrosis. Lancet. 2021;397(10290):2195–2211",
    sourceUrl: "https://doi.org/10.1016/S0140-6736(20)32542-3",
  },

  // --- Immunbrist ----------------------------------------------------------
  {
    id: "cvid_systematic_review",
    type: "evidence",
    icon: "shield",
    short: "Janssen 2021",
    title: "CVID vid diagnos – 75 % luftvägsinfektioner, 28 % redan bronkiektasier",
    tag: "Systematisk översikt · 8 521 patienter",
    tagColor: "bg-violet-500/15 text-violet-400",
    diseases: ["immunbrist", "bronkiektasi"],
    summary:
      "Systematisk översikt och metaanalys av hur Common Variable Immunodeficiency presenterar sig kliniskt, baserad på 8 521 patienter. Recidiverande övre eller nedre luftvägsinfektioner förelåg hos 75 % vid diagnos och 28 % hade redan utvecklat bronkiektasier. Diagnosfördröjningen är i genomsnitt 6–7 år, och debuten ligger oftast i 20–40-årsåldern. För Marcs del är frågan besvarad: IgG 11, 11,9 och 12,0 g/L med normala IgA och IgM vid tre tillfällen 2019 och 2025 utesluter CVID. Kvar står den mindre varianten – specifik antikroppsbrist med normalt total-IgG – som bara hittas via vaccinationssvar.",
    source: "Janssen LMA, van der Flier M, de Vries E. Lessons Learned From the Clinical Presentation of Common Variable Immunodeficiency Disorders: A Systematic Review and Meta-Analysis. Front Immunol. 2021;12:620709",
    sourceUrl: "https://doi.org/10.3389/fimmu.2021.620709",
  },
  {
    id: "iei_practice_parameter_2025",
    type: "evidence",
    icon: "list",
    short: "IEI Practice Parameter",
    title: "Medfödda immunbrister – när och hur man screenar",
    tag: "AAAAI / ACAAI / CIS 2025",
    tagColor: "bg-violet-500/15 text-violet-400",
    diseases: ["immunbrist", "bronkiektasi"],
    summary:
      "Gemensamt riktlinjedokument från de amerikanska allergi- och immunologiföreningarna. Kvantitativa immunglobuliner är första steget vid recidiverande infektioner, men dokumentet är tydligt med att normala nivåer inte avslutar utredningen: nästa steg är funktionellt antikroppssvar, i praktiken pneumokockantikroppar före och efter vaccination, samt IgG-subklasser. Specifik antikroppsbrist ger samma sinopulmonella infektionsmönster med kapslade bakterier som CVID, men med normalt total-IgG. Här finns också principen att infektionernas lokalisation och mönster styr vilken defekt man letar efter.",
    source: "Orange JS, Chinen J, Horner CC, et al. 2025 Inborn Errors of Immunity Practice Parameter. Ann Allergy Asthma Immunol. 2026;136(4):426–493.e1",
    sourceUrl: "https://doi.org/10.1016/j.anai.2025.10.026",
  },
  {
    id: "cvid_case_studies",
    type: "evidence",
    icon: "microscope",
    short: "Cunningham-Rundles 2019a",
    title: "CVID i praktiken – fallbaserad genomgång",
    tag: "Blood 2019",
    tagColor: "bg-violet-500/15 text-violet-400",
    diseases: ["immunbrist"],
    summary:
      "Fallbaserad genomgång av hur CVID ser ut i verkligheten, skriven av en av områdets ledande kliniker. Illustrerar hur patienter söker upprepade gånger för enskilda infektioner utan att helhetsbilden sätts ihop, och hur autoimmuna och gastrointestinala manifestationer kan dominera så att antikroppsdefekten förbises. Mönstret är igenkännbart hos Marc – fyra antibiotikakurer på tre månader utan att en samlad utredning startades – även om just CVID är uteslutet.",
    source: "Cunningham-Rundles C. Common Variable Immune Deficiency: Case Studies. Blood. 2019;134(21):1787–1795",
    sourceUrl: "https://doi.org/10.1182/blood.2019002062",
  },
  {
    id: "cvid_dissection",
    type: "evidence",
    icon: "dna",
    short: "Cunningham-Rundles 2019b",
    title: "CVID – varför sjukdomen är så heterogen",
    tag: "Immunological Reviews 2019",
    tagColor: "bg-violet-500/15 text-violet-400",
    diseases: ["immunbrist"],
    summary:
      "Översikt av CVID:s immunologiska mekanismer och variationen i uttryck – från nästan enbart infektionsbenägenhet till bilder dominerade av autoimmunitet, granulomatös sjukdom eller tarmengagemang. Förklarar varför diagnosen ställs sent och varför antikroppsdefekter bildar ett spektrum där totala immunglobuliner bara fångar den grövsta änden.",
    source: "Cunningham-Rundles C. Common variable immune deficiency: Dissection of the variable. Immunol Rev. 2019;287(1):145–161",
    sourceUrl: "https://doi.org/10.1111/imr.12728",
  },
  {
    id: "cvid_medlineplus",
    type: "evidence",
    icon: "book",
    short: "MedlinePlus",
    title: "CVID – patientnära faktabeskrivning",
    tag: "Patientinformation",
    tagColor: "bg-secondary text-muted-foreground",
    diseases: ["immunbrist"],
    summary:
      "Amerikanska National Library of Medicines faktasida om Common Variable Immune Deficiency: nedsatt antikroppsproduktion, återkommande infektioner i luftvägar och mag-tarmkanal, ökad förekomst av autoimmuna tillstånd och behandling med immunglobulinsubstitution. Användbar som bakgrundsläsning snarare än som kliniskt beslutsunderlag.",
    source: "Common variable immune deficiency. National Library of Medicine (MedlinePlus)",
    sourceUrl: "https://medlineplus.gov/genetics/condition/common-variable-immune-deficiency/",
  },

  // --- Bihålor -------------------------------------------------------------
  {
    id: "rinosinuit_epos_2020",
    type: "evidence",
    icon: "eye",
    short: "EPOS 2020",
    title: "Kronisk rinosinuit – europeiskt positionsdokument",
    tag: "EPOS 2020",
    tagColor: "bg-cyan-500/15 text-cyan-400",
    diseases: ["pcd", "bronkiektasi"],
    summary:
      "Europeiskt positionsdokument om rinosinuit och näspolypos. Diagnosen kronisk rinosinuit kräver symtom i minst tolv veckor tillsammans med objektiva fynd vid endoskopi eller skiktröntgen – vilket är precis skillnaden mellan de två ÖNH-bedömningarna Marc fick i mars och april 2025. Nässköljning med lokal kortikosteroid är förstahandsbehandling. Dokumentet framhåller också att kronisk rinosinuit hos en patient med samtidig nedre luftvägssjukdom ska väcka frågan om en gemensam underliggande orsak, exempelvis ciliedysfunktion eller immunbrist, i stället för att behandlas som två separata tillstånd.",
    source: "Fokkens WJ, Lund VJ, Hopkins C, et al. European Position Paper on Rhinosinusitis and Nasal Polyps 2020. Rhinology. 2020;58(Suppl S29):1–464",
    sourceUrl: "https://doi.org/10.4193/Rhin20.600",
  },

  // --- Typ 1-diabetes ------------------------------------------------------
  {
    id: "ada_diagnosis_2026",
    type: "evidence",
    icon: "droplet",
    short: "ADA 2026 §2",
    title: "Diagnos och klassifikation av diabetes – ADA Standards of Care 2026",
    tag: "Riktlinje",
    tagColor: "bg-orange-500/15 text-orange-400",
    diseases: ["diabetes"],
    summary:
      "American Diabetes Associations årliga standarddokument, kapitlet om diagnostik och klassifikation. Ligger till grund för hur typ 1-diabetes definieras och hur glykemisk kontroll mäts och tolkas. Relevansen för Marc gäller den hypotes som föll: vid otillräcklig insulineffekt överskrids njurtröskeln och kalorier går förlorade i urinen, men det kräver betydligt högre glukosnivåer än HbA1c 40–49 mmol/mol och 74 % tid i målområde.",
    source:
      "American Diabetes Association Professional Practice Committee. 2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S27–S49",
    sourceUrl: "https://doi.org/10.2337/dc26-S002",
  },
  {
    id: "t1d_jama_2026",
    type: "evidence",
    icon: "droplet",
    short: "JAMA 2026",
    title: "Typ 1-diabetes – aktuell översikt",
    tag: "Översikt JAMA 2026",
    tagColor: "bg-orange-500/15 text-orange-400",
    diseases: ["diabetes"],
    summary:
      "Sammanfattande genomgång av typ 1-diabetes: patogenes, diagnostik, modern insulinbehandling med pump och kontinuerlig glukosmätning, samt uppföljning. Relevant för tolkningen av CGM-data där tid i målområde och variabilitet säger mer än medelvärdet – Marcs 74 % i målområde med 5 % under 3,9 mmol/L och standardavvikelse 3,1 är ett exempel på när variabiliteten är det egentliga problemet.",
    source: "Jacobsen LM, Schatz DA. Type 1 Diabetes. JAMA. 2026",
    sourceUrl: "https://doi.org/10.1001/jama.2026.0048",
  },
  {
    id: "t1d_lancet_2023",
    type: "evidence",
    icon: "droplet",
    short: "Lancet 2023",
    title: "Typ 1-diabetes – seminar med fokus på autoimmun samsjuklighet",
    tag: "Lancet Seminar",
    tagColor: "bg-orange-500/15 text-orange-400",
    diseases: ["diabetes", "ärftlighet"],
    summary:
      "Genomgång av sjukdomsmekanismer, immunologi och samsjuklighet vid typ 1-diabetes. Autoimmun tyreoideasjukdom förekommer hos omkring 15–30 % av patienterna och övrig autoimmunitet är kraftigt överrepresenterad, vilket motiverar återkommande screening. Hos Marc är tyreoideafunktionen kontrollerad och normal, medan celiakiserologi aldrig tagits trots 17 års sjukdomsduration.",
    source: "Quattrin T, Mastrandrea LD, Walker LSK. Type 1 Diabetes. Lancet. 2023;401(10394):2149–2162",
    sourceUrl: "https://doi.org/10.1016/S0140-6736(23)00223-4",
  },
  {
    id: "ada_comorbid_2026",
    type: "evidence",
    icon: "stethoscope",
    short: "ADA 2026 §4",
    title: "Komorbiditetsscreening vid diabetes – vad som ska kontrolleras och hur ofta",
    tag: "Riktlinje",
    tagColor: "bg-orange-500/15 text-orange-400",
    diseases: ["diabetes", "celiaki"],
    summary:
      "Kapitlet om fullständig medicinsk utvärdering och samsjuklighet i ADA:s standarddokument, där rekommendationerna om tyreoideascreening, celiakiscreening, njurfunktionsuppföljning och näringsstatus samlas. Njuravsnittet är relevant för Marcs kreatininvariation: bedömningen ska bygga på både eGFR och albuminuri, och normal albuminuri vid sjunkande eGFR pekar bort från klassisk diabetesnefropati.",
    source:
      "American Diabetes Association Professional Practice Committee. 4. Comprehensive Medical Evaluation and Assessment of Comorbidities: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S61–S88",
    sourceUrl: "https://doi.org/10.2337/dc26-S004",
  },
  {
    id: "ada_children_2026",
    type: "evidence",
    icon: "list",
    short: "ADA 2026 §14",
    title: "Screeningintervall vid typ 1-diabetes – celiaki och tyreoidea",
    tag: "Riktlinje",
    tagColor: "bg-amber-500/15 text-amber-400",
    diseases: ["diabetes", "celiaki"],
    summary:
      "Kapitlet om barn och ungdomar med diabetes innehåller de mest detaljerade screeningrekommendationerna för celiaki: vävnadstransglutaminas-IgA tillsammans med total-IgA, eftersom selektiv IgA-brist annars ger falskt negativt svar. Marcs total-IgA är normal vid tre tillfällen, vilket gör att serologin blir tolkbar utan förbehåll – men provet har aldrig tagits.",
    source:
      "American Diabetes Association Professional Practice Committee. 14. Children and Adolescents: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S297–S320",
    sourceUrl: "https://doi.org/10.2337/dc26-S014",
  },

  // --- Celiaki -------------------------------------------------------------
  {
    id: "celiaki_who_to_test",
    type: "evidence",
    icon: "layers",
    short: "Zingone 2024",
    title: "Vem ska testas för celiaki? – 5–16 % prevalens vid typ 1-diabetes",
    tag: "Gastroenterology 2024",
    tagColor: "bg-amber-500/15 text-amber-400",
    diseases: ["celiaki", "diabetes"],
    summary:
      "Genomgång av vilka tillstånd som motiverar celiakiscreening. Typ 1-diabetes är en av de starkaste indikationerna: prevalensen anges till 5–16 %, mot omkring 1 % i befolkningen. En stor andel av fallen är symtomfattiga, vilket gör att symtomstyrd screening missar dem. Malabsorptionen förklarar viktnedgång direkt och kan via järn-, zink- och D-vitaminbrist bidra till infektionsbenägenhet – vilket hos Marc skulle koppla ihop tarm och luftvägar.",
    source: "Zingone F, Bai JC, Cellier C, Ludvigsson JF. Celiac Disease-Related Conditions: Who to Test? Gastroenterology. 2024;167(1):64–78",
    sourceUrl: "https://doi.org/10.1053/j.gastro.2024.02.044",
  },

  // --- Hormon --------------------------------------------------------------
  {
    id: "gynekomasti_nejm_2007",
    type: "evidence",
    icon: "heart",
    short: "Braunstein 2007",
    title: "Förhöjt östradiol hos män – utredningsgång och den farliga diagnosen",
    tag: "N Engl J Med",
    tagColor: "bg-pink-500/15 text-pink-400",
    diseases: ["hormon", "malignitet"],
    summary:
      "Klinisk översikt över gynekomasti och hyperöstrogenism hos män. Utredningen bygger på testosteron, LH, östradiol, hCG, prolaktin, tyreoideaprover och leverstatus. Den viktigaste diagnosen att inte missa är hCG-producerande tumör, framför allt i testikeln, och därför ingår hCG och testikelundersökning i basutredningen. Vanligare orsaker är läkemedel, leversjukdom, övervikt och hypogonadism. Hos Marc talar normalt testosteron och normalt LH emot hypogonadism, vilket flyttar tyngdpunkten till hCG-frågan och till att verifiera analysen.",
    source: "Braunstein GD. Clinical practice. Gynecomastia. N Engl J Med. 2007;357(12):1229–1237",
    sourceUrl: "https://doi.org/10.1056/NEJMcp070677",
  },

  // --- Viktnedgång och malignitet -----------------------------------------
  {
    id: "weightloss_cancer_bmj",
    type: "evidence",
    icon: "stethoscope",
    short: "Nicholson 2024",
    title: "Oförklarad viktnedgång i primärvården – vilka ska cancerutredas?",
    tag: "BMJ 2024 · diagnostisk träffsäkerhet",
    tagColor: "bg-emerald-500/15 text-emerald-400",
    diseases: ["malignitet"],
    summary:
      "Studie av hur patienter med oväntad viktnedgång i primärvården bör prioriteras för cancerutredning, med riskmodeller baserade på ålder, kön, symtom och enkla blodprover. Modellerna är utvecklade i äldre populationer där cancerrisken är betydligt högre än hos en 28-åring och kan inte överföras rakt av. Slutsatsen som håller är att basal blodprovsscreening görs först och att bilddiagnostik reserveras för dem som avviker – med undantag för specifika fynd som en ny lymfkörtel, där bilddiagnostik är motiverad i sig.",
    source:
      "Nicholson BD, Virdee P, Aveyard P, et al. Prioritising primary care patients with unexpected weight loss for cancer investigation: diagnostic accuracy study (update). BMJ. 2024;387:e080199",
    sourceUrl: "https://doi.org/10.1136/bmj-2024-080199",
  },
  {
    id: "weightloss_occult_cancer",
    type: "evidence",
    icon: "microscope",
    short: "Hernández 2003",
    title: "Ofrivillig viktnedgång utan specifika symtom – vad utredningen ger",
    tag: "Am J Med",
    tagColor: "bg-emerald-500/15 text-emerald-400",
    diseases: ["malignitet"],
    summary:
      "Klinisk studie av patienter med ofrivillig viktnedgång utan andra vägledande symtom. En strukturerad basutredning – anamnes, status, rutinblodprover och riktad uppföljning – identifierar merparten av de orsaker som går att hitta, medan svepande bilddiagnostik utan avvikelser i basutredningen ger lite. Studien understryker också att kronisk infektion och kronisk inflammatorisk sjukdom hör till de vanligaste icke-maligna förklaringarna, vilket är precis vad bronkiektasier med daglig purulent sekretion utgör.",
    source:
      "Hernández JL, Riancho JA, Matorras P, González-Macías J. Clinical evaluation for cancer in patients with involuntary weight loss without specific symptoms. Am J Med. 2003;114(8):631–637",
    sourceUrl: "https://doi.org/10.1016/S0002-9343(03)00115-3",
  },

  // --- Ärftlighet ----------------------------------------------------------
  {
    id: "t1d_familial_aggregation",
    type: "evidence",
    icon: "dna",
    short: "Kuo 2018",
    title: "Familjehistorik av typ 1-diabetes ökar risken för andra autoimmuna sjukdomar",
    tag: "Svensk registerstudie",
    tagColor: "bg-fuchsia-500/15 text-fuchsia-400",
    diseases: ["ärftlighet"],
    summary:
      "Stor svensk registerstudie av familjär aggregation vid typ 1-diabetes. Familjehistorik var associerad med ökad risk för reumatoid artrit (RR 1,51), Sjögrens syndrom (RR 1,66), SLE (RR 1,48) och tyreoideasjukdom (RR 1,61–1,78). I en familj med autoimmun klustring – hos Marc egen typ 1-diabetes och MS hos faster – är förhandssannolikheten för ytterligare autoimmun sjukdom förhöjd, vilket sänker tröskeln för celiakiscreening.",
    source:
      "Kuo CF, Chou IJ, Grainge MJ, et al. Familial aggregation and heritability of type 1 diabetes mellitus and coaggregation of chronic diseases in affected families. Clin Epidemiol. 2018;10:1447–1455",
    sourceUrl: "https://doi.org/10.2147/CLEP.S172207",
  },
  {
    id: "t1d_genetic_overlap",
    type: "evidence",
    icon: "dna",
    short: "Márquez 2022",
    title: "Delade riskgener mellan typ 1-diabetes och annan autoimmunitet",
    tag: "Semin Immunopathol",
    tagColor: "bg-fuchsia-500/15 text-fuchsia-400",
    diseases: ["ärftlighet"],
    summary:
      "Genomgång av den genetiska överlappningen mellan typ 1-diabetes och andra autoimmuna sjukdomar. Flera riskgener återkommer i flera sjukdomar – PTPN22, CTLA4, IL2RA och IFIH1 – vilket förklarar varför autoimmuna tillstånd klustrar både hos individen och i familjen. Detta är grunden för att screena brett för samsjuklighet i stället för att invänta riktade symtom.",
    source: "Márquez A, Martín J. Genetic overlap between type 1 diabetes and other autoimmune diseases. Semin Immunopathol. 2022;44(1):81–97",
    sourceUrl: "https://doi.org/10.1007/s00281-021-00885-6",
  },
  {
    id: "t1d_genetic_risk",
    type: "evidence",
    icon: "dna",
    short: "Pociot 2016",
    title: "Genetiska riskfaktorer för typ 1-diabetes",
    tag: "Lancet",
    tagColor: "bg-fuchsia-500/15 text-fuchsia-400",
    diseases: ["ärftlighet", "diabetes"],
    summary:
      "Översikt över den genetiska arkitekturen bakom typ 1-diabetes: HLA-regionens dominerande roll och ett stort antal ytterligare riskloci, varav flera delas med andra autoimmuna sjukdomar. Ger bakgrunden till varför en familj kan uppvisa flera olika autoimmuna diagnoser utan att det rör sig om ett enskilt ärftligt syndrom – och varför genetisk testning i dagsläget inte ändrar handläggningen kliniskt.",
    source: "Pociot F, Lernmark Å. Genetic risk factors for type 1 diabetes. Lancet. 2016;387(10035):2331–2339",
    sourceUrl: "https://doi.org/10.1016/S0140-6736(16)30582-7",
  },
];

export const SUGGESTED_QUERIES = [
  "Varför ska mykobakterieodling tas före makrolidprofylax?",
  "Vad talar för primär ciliär dyskinesi i den här bilden?",
  "Vad har svettestet och immunglobulinerna redan uteslutit?",
  "Vad kan förklara viktnedgången när HbA1c är bra?",
  "Hur utreds förhöjt östradiol hos en ung man?",
];

export const EVIDENCE_IMAGES = {
  // Lägg till bilder här vid behov:
  // algorithm: "/utredningsalgoritm.png",
  // algorithm_caption: "...",
};
