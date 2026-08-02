import { AlertTriangle, ShieldAlert, Info, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

// Known interactions database: [classA, classB, severity, description, advice, source]
const INTERACTION_DB = [
  {
    classes: ["Antikoagulantia", "Statin"],
    severity: "måttlig",
    title: "Eliquis + Statin → förhöjd blödningsrisk",
    description: "Vissa statiner (särskilt Atorvastatin) hämmar CYP3A4 och kan höja Eliquis-nivån med upp till 30%, vilket ökar blödningsrisken.",
    advice: "Informera läkare. Inga dosjusteringar krävs rutinmässigt men observera blödningssymtom (blåmärken, tandblödning, mörk urin).",
    source_label: "FASS – Eliquis interaktioner",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=20110801000012",
  },
  {
    classes: ["Antikoagulantia", "ACE-hämmare/ARB"],
    severity: "låg",
    title: "Eliquis + ACE-hämmare → njurpåverkan",
    description: "ACE-hämmare kan minska njurfunktionen (eGFR), vilket bromsar utsöndringen av Eliquis och ger högre blodnivåer.",
    advice: "Kontrollera eGFR och kreatinin regelbundet. Vid eGFR < 30 ska Eliquis-dosen ses över.",
    source_label: "ESC 2023 – AF riktlinjer",
    source_url: "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Atrial-Fibrillation",
  },
  {
    classes: ["Betablockerare", "Digoxin"],
    severity: "hög",
    title: "Bisoprolol + Digoxin → allvarlig bradykardi",
    description: "Kombinationen av betablockerare och digoxin ger additiv bromsning av AV-noden. Risk för farlig hjärtfrekvens under 40 slag/min.",
    advice: "Kräver EKG-monitorering och täta kontroller av S-Digoxin och puls. Undvik kombination utan kardiologbedömning.",
    source_label: "viss.nu – Digoxin",
    source_url: "https://www.viss.nu/behandlingsrekommendationer/hjarta-karl/",
  },
  {
    classes: ["Diuretika", "ACE-hämmare/ARB"],
    severity: "måttlig",
    title: "Furosemid + ACE-hämmare → hypokalemi & njurpåverkan",
    description: "Kombination kan ge kraftigt blodtrycksfall (first-dose hypotension), hypokalemi och försämrad njurfunktion.",
    advice: "Kontrollera elektrolyter (K+, Mg2+), kreatinin och blodtryck inom 1-2 veckor efter uppstart.",
    source_label: "FASS – Furosemid interaktioner",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=19620101000017",
  },
  {
    classes: ["Diuretika", "Digoxin"],
    severity: "hög",
    title: "Furosemid + Digoxin → förstärkt digitalistoxicitet",
    description: "Furosemid orsakar hypokalemi och hypomagnasemi, vilket kraftigt ökar risken för digitalisintoxikation (arytmier, illamående, synrubbningar).",
    advice: "Kontrollera S-Kalium och S-Digoxin tätt. Kaliumsubstitution kan behövas. Observera intoxikationssymtom.",
    source_label: "FASS – Digoxin interaktioner",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=19620801000029",
  },
  {
    classes: ["Aldosteronantagonist", "ACE-hämmare/ARB"],
    severity: "hög",
    title: "Spironolakton + ACE-hämmare → allvarlig hyperkalemi",
    description: "Kombinationen kan ge livshotande hyperkalemi (högt kalium), särskilt vid nedsatt njurfunktion eller diabetes.",
    advice: "Kontrollera S-Kalium och eGFR inom 1 vecka efter start och sedan regelbundet. Undvik kombination vid eGFR < 30.",
    source_label: "viss.nu – Hjärtsvikt",
    source_url: "https://www.viss.nu/behandlingsrekommendationer/hjarta-karl/hjartsvikt/",
  },
  {
    classes: ["Aldosteronantagonist", "Diuretika"],
    severity: "måttlig",
    title: "Spironolakton + Furosemid → elektrolytrubbningar",
    description: "Kan ge kaliumrubbningar åt båda håll beroende på njurfunktion. Furosemid sänker kalium, spironolakton höjer det – balansen är svårförutsägbar.",
    advice: "Täta elektrolytkontroller. Används ofta avsiktligt i kombination men kräver noggrann monitorering.",
    source_label: "FASS – Spironolakton",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=19681001000018",
  },
  {
    classes: ["Antikoagulantia", "Diuretika"],
    severity: "låg",
    title: "Eliquis + Furosemid → dehydrering påverkar koagulation",
    description: "Dehydrering från loop-diuretika kan förändra njurfunktionen och påverka Eliquis-clearance.",
    advice: "Se till att hålla god vätskebalans. Kontrollera njurfunktion regelbundet.",
    source_label: "ESC 2023 – AF",
    source_url: "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Atrial-Fibrillation",
  },
  {
    classes: ["Tyroxin", "Kalcium/D-vitamin"],
    severity: "måttlig",
    title: "Levaxin + Kolekalciferol/Kalcium → minskad absorption",
    description: "Kalcium binder till Levaxin i tarmen och minskar absorptionen med upp till 40% om de tas samtidigt.",
    advice: "Ta Levaxin minst 4 timmar FÖRE eller EFTER Kolekalciferol + Kalcium. Viktigt att separera dessa.",
    source_label: "FASS – Levaxin interaktioner",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=19560301000015",
  },
  {
    classes: ["Metformin", "Diuretika"],
    severity: "måttlig",
    title: "Metformin + Furosemid → laktatacidos-risk",
    description: "Furosemid kan försämra njurfunktionen vilket bromsar Metformin-utsöndringen. Risk för laktatacidos vid kraftig dehydrering eller njurpåverkan.",
    advice: "Kontrollera eGFR. Pausa Metformin vid akut sjukdom med dehydrering eller vid eGFR < 30.",
    source_label: "FASS – Metformin",
    source_url: "https://www.fass.se/LIF/product?userType=0&nplId=19940601000017",
  },
];

const SEVERITY_CONFIG = {
  hög: {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    headerBg: "bg-rose-500/15",
    icon: ShieldAlert,
    label: "HÖG RISK",
    dot: "bg-rose-500",
  },
  måttlig: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    headerBg: "bg-amber-500/15",
    icon: AlertTriangle,
    label: "MÅTTLIG",
    dot: "bg-amber-500",
  },
  låg: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    headerBg: "bg-blue-500/15",
    icon: Info,
    label: "OBSERVERA",
    dot: "bg-blue-500",
  },
};

function InteractionCard({ interaction }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[interaction.severity];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 p-3 ${cfg.headerBg} text-left`}
      >
        <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
          <p className="text-xs font-semibold text-foreground leading-snug">{interaction.title}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className={`p-3 space-y-2 ${cfg.bg}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">{interaction.description}</p>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[11px] font-semibold text-foreground mb-0.5">Råd:</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{interaction.advice}</p>
          </div>
          {interaction.source_url && (
            <a href={interaction.source_url} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-[11px] ${cfg.color} hover:underline`}>
              {interaction.source_label}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Drug class mapping — matches against med.drug_class or med.name
const CLASS_MAP = [
  { match: /eliquis|apixaban|antikoagulant/i, class: "Antikoagulantia" },
  { match: /bisoprolol|betablockerare|metoprolol|atenolol/i, class: "Betablockerare" },
  { match: /digoxin/i, class: "Digoxin" },
  { match: /furosemid|diuretika|loop/i, class: "Diuretika" },
  { match: /spironolakton|aldosteron/i, class: "Aldosteronantagonist" },
  { match: /statin|atorvastatin|simvastatin|rosuvastatin/i, class: "Statin" },
  { match: /ramipril|ace-h|arb|lisinopril|enalapril|losartan/i, class: "ACE-hämmare/ARB" },
  { match: /levaxin|tyroxin|levotyroxin/i, class: "Tyroxin" },
  { match: /metformin/i, class: "Metformin" },
  { match: /kolekalciferol|kalcium|d-vitamin/i, class: "Kalcium/D-vitamin" },
  { match: /magnesium/i, class: "Magnesium" },
];

function resolveClass(med) {
  if (med.drug_class) return med.drug_class;
  for (const entry of CLASS_MAP) {
    if (entry.match.test(med.name)) return entry.class;
  }
  return null;
}

export default function DrugInteractionAlert({ medications }) {
  const [showAll, setShowAll] = useState(false);

  // Only check active + recommended meds
  const relevantMeds = medications.filter(m => m.status === "aktiv" || m.status === "rekommenderad" || m.is_active === true);
  const classes = [...new Set(relevantMeds.map(resolveClass).filter(Boolean))];

  // Find applicable interactions
  const found = INTERACTION_DB.filter(interaction =>
    interaction.classes.every(c => classes.includes(c))
  );

  if (found.length === 0) return null;

  const highCount = found.filter(i => i.severity === "hög").length;
  const visibleInteractions = showAll ? found : found.slice(0, 3);

  return (
    <div className="bg-card rounded-2xl border border-rose-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-rose-500/10 to-rose-400/5 border-b border-rose-500/20">
        <div className="p-2 rounded-xl bg-rose-500/20">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Läkemedelsinteraktioner</h3>
          <p className="text-xs text-muted-foreground">Baserat på din aktiva & rekommenderade medicinlista</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {highCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 animate-pulse">
              {highCount} HÖG RISK
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {found.length} totalt
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {visibleInteractions.map((interaction, i) => (
          <InteractionCard key={i} interaction={interaction} />
        ))}
        {found.length > 3 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors"
          >
            {showAll ? "Visa färre" : `Visa alla ${found.length} interaktioner`}
          </button>
        )}
      </div>
    </div>
  );
}