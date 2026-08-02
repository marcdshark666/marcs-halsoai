import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, LineChart } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatRef } from "@/utils/labNormalizer";

// Ikonriktning = avvikelseriktning; färg = allvarlighetsgrad (kritisk alltid röd).
function getTrendIcon(status) {
  if (status === "critical_high") return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (status === "critical_low") return <TrendingDown className="w-4 h-4 text-red-500" />;
  if (status === "high") return <TrendingUp className="w-4 h-4 text-amber-500" />;
  if (status === "low") return <TrendingDown className="w-4 h-4 text-amber-500" />;
  return <Minus className="w-4 h-4 text-emerald-500" />;
}

// Avstånd från referensintervallet (0 = inom intervallet). Används för att
// färga förändringar efter om värdet rör sig MOT eller FRÅN referensen –
// för t.ex. eGFR är en ökning bra, för LDL dålig; riktningen ensam säger inget.
function distanceFromRef(value, low, high) {
  if (low != null && value < low) return low - value;
  if (high != null && value > high) return value - high;
  return 0;
}

export function deltaTone(result, prev) {
  if (!prev) return "text-muted-foreground";
  const dNow = distanceFromRef(result.value, result.reference_low, result.reference_high);
  const dPrev = distanceFromRef(prev.value, prev.reference_low ?? result.reference_low, prev.reference_high ?? result.reference_high);
  if (dNow === 0 && dPrev === 0) return "text-muted-foreground"; // normalt → normalt
  if (dNow < dPrev) return "text-emerald-400";  // närmar sig referens = förbättring
  if (dNow > dPrev) return "text-red-400";      // avlägsnar sig = försämring
  return "text-muted-foreground";
}

// Patientvänliga förklaringar av vanliga labbprov
const TEST_EXPLANATIONS = {
  "Hb": "Mängden röda blodkroppar – visar om du har tillräckligt med syre i blodet.",
  "Hemoglobin": "Mängden röda blodkroppar – visar om du har tillräckligt med syre i blodet.",
  "CRP": "Tecken på inflammation eller infektion i kroppen.",
  "eGFR": "Hur väl njurarna fungerar och renar blodet.",
  "Kreatinin": "Avfallsämne som njurarna ska rensa ut – visar njurfunktion.",
  "TSH": "Sköldkörtelns aktivitet – styr ämnesomsättning och energi.",
  "T4": "Sköldkörtelhormon som påverkar energi, vikt och puls.",
  "Glukos": "Blodsocker – visar risk för diabetes.",
  "HbA1c": "Genomsnittligt blodsocker de senaste 2–3 månaderna.",
  "Kolesterol": "Fett i blodet – visar risk för hjärtsjukdom.",
  "LDL": "Det 'onda' kolesterolet som kan samlas i blodkärlen.",
  "HDL": "Det 'goda' kolesterolet som skyddar blodkärlen.",
  "Triglycerider": "En annan typ av fett i blodet kopplad till mat och ämnesomsättning.",
  "Leukocyter": "Vita blodkroppar – kroppens försvar mot infektion.",
  "Trombocyter": "Blodplättar som får blodet att levra sig vid blödning.",
  "INR": "Hur långsamt blodet levrar sig – viktigt vid blodförtunnande medicin.",
  "Natrium": "Saltnivå i blodet – påverkar vätskebalansen.",
  "Kalium": "Ett mineral som styr hjärtats rytm och muskler.",
  "Kalcium": "Ett mineral viktigt för ben, muskler och nerver.",
  "Järn": "Viktigt för att blodet ska kunna transportera syre.",
  "Ferritin": "Kroppens järndepå – visar om du har brist på järn.",
  "Vitamin B12": "Viktigt för nerver och blodbildning.",
  "Vitamin D": "Viktigt för benstyrka och immunförsvar.",
  "ALAT": "Leverenzym – visar om levern är påverkad.",
  "ASAT": "Lever- och muskelenzym – visar leverskada eller muskelbelastning.",
  "ALP": "Enzym kopplat till lever och ben.",
  "Bilirubin": "Nedbrytningsprodukt som kan visa galla- eller leverproblem.",
  "Albumin": "Ett protein i blodet – visar näringstillstånd och leverfunktion.",
  "P-Glukos": "Blodsocker – visar risk för diabetes.",
  "P-Kreatinin": "Avfallsämne som njurarna ska rensa ut – visar njurfunktion.",
  "B-Hb": "Mängden röda blodkroppar – visar om du har tillräckligt med syre i blodet.",
  "B-Leukocyter": "Vita blodkroppar – kroppens försvar mot infektion.",
  "B-Trombocyter": "Blodplättar som får blodet att levra sig vid blödning.",
};

// Längsta nyckel först så att "HbA1c" vinner över "Hb" för t.ex. "B-HbA1c (IFCC)".
const EXPLANATION_KEYS = Object.keys(TEST_EXPLANATIONS).sort((a, b) => b.length - a.length);

function getExplanation(testName) {
  if (!testName) return null;
  // Exakt match
  if (TEST_EXPLANATIONS[testName]) return TEST_EXPLANATIONS[testName];
  // Fuzzy match - kolla om något nyckelord finns i provnamnet (längsta först)
  for (const key of EXPLANATION_KEYS) {
    if (testName.toLowerCase().includes(key.toLowerCase())) {
      return TEST_EXPLANATIONS[key];
    }
  }
  return null;
}

// Liten inline-trendkurva utan diagrambibliotek – snabb även med många kort.
function Sparkline({ series }) {
  if (!series || series.length < 2) return null;
  const values = series.map(r => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72, h = 20, pad = 2;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastAbnormal = series[series.length - 1].status !== "normal";
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={lastAbnormal ? "rgb(248 113 113)" : "rgb(52 211 153)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export default function LabValueCard({ result, onClick, historyCount = 1, series }) {
  const isAbnormal = result.status !== "normal";
  const hasHistory = historyCount > 1;

  // Förändring mot föregående mätning
  const prev = series && series.length > 1 ? series[series.length - 2] : null;
  const delta = prev ? result.value - prev.value : null;
  const deltaPercent = prev && prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : null;

  return (
    <button
      onClick={() => onClick?.(result.test_name)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isAbnormal
          ? "bg-red-50/50 border-red-200 hover:border-red-300 dark:bg-red-950/40 dark:border-red-800 dark:hover:border-red-700"
          : "bg-card border-border hover:border-primary/30"
      } ${hasHistory ? "ring-1 ring-primary/20 cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {isAbnormal && <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span className="text-sm font-medium text-muted-foreground">{result.test_name}</span>
        </div>
        {getTrendIcon(result.status)}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${isAbnormal ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
          {result.value}
        </span>
        <span className="text-xs text-muted-foreground">{result.unit}</span>
        {delta != null && delta !== 0 && (
          <span
            className={`ml-auto text-[11px] font-semibold font-mono ${deltaTone(result, prev)}`}
            title={`Föregående: ${prev.value} ${prev.unit || ""} (${prev.sample_date}). Grönt = rör sig mot referensintervallet, rött = ifrån.`}
          >
            {delta > 0 ? "+" : ""}{Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1)}
            {deltaPercent != null && ` (${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(0)}%)`}
          </span>
        )}
      </div>
      {series && series.length > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <Sparkline series={series} />
          <span className="text-[10px] text-muted-foreground font-mono">{result.sample_date}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <StatusBadge status={result.status} />
        <span className="text-xs text-muted-foreground font-mono">
          ref: {formatRef(result.reference_low, result.reference_high)}
        </span>
      </div>
      {hasHistory && (
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold">
          <LineChart className="w-3 h-3" />
          {historyCount} mätningar · visa trend
        </div>
      )}
      {!result.is_validated && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Ej vidimerat</div>
      )}
      {getExplanation(result.test_name) && (
        <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-start gap-1.5">
          <Info className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {getExplanation(result.test_name)}
          </p>
        </div>
      )}
    </button>
  );
}