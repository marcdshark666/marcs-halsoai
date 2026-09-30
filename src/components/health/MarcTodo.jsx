import { useState, useEffect } from "react";
import { ListChecks, Plug, Stethoscope, CheckCircle2 } from "lucide-react";

// "Att göra för Marc" – engångsuppgifter (inkoppling + vård under febern).
// Kryssen sparas bara i den här webbläsaren (localStorage). Sidan är publik:
// inga användarnamn, e-postadresser eller lösenord här.
const STORAGE_KEY = "marc_att_gora_v1";

const GROUPS = [
  {
    title: "Inkoppling (på datorn, i mappen marcs-halsoai)",
    icon: Plug,
    items: [
      { id: "dexcom", text: "Kör `npm run set-dexcom` – Dexcom Share-inloggning (samma konto som i Sugar Buddy). Lösenordet skrivs dolt, bara av dig." },
      { id: "glooko", text: "Kör `npm run set-glooko` – Glooko-inloggning (EU/US). Ger doser + ev. CGM." },
      { id: "github-pages", text: "Kör `gh auth refresh -h github.com -s workflow`, sedan `git push` och `gh api -X POST repos/marcdshark666/marcs-halsoai/pages -f build_type=workflow` – startar GitHub-sidan." },
      { id: "google-photos", text: "Google Photos Picker: aktivera API:t i Sugar Buddys Google Cloud-projekt och kör `npm run google-login` (steg i GLUKOS.md)." },
      { id: "gemini", text: "(Frivilligt) `npm run set-gemini` – samma gratis Gemini-nyckel som Sugar Buddy." },
      { id: "permissions", text: "Lägg in behörighetsregel i Claude Code (/permissions) för git add/commit/push, gh repo create och vercel – så uppdateras sidan automatiskt." },
    ],
  },
  {
    title: "Vård (febersjukdom från 29/9)",
    icon: Stethoscope,
    items: [
      { id: "snabbtest", text: "Snabbtest/PCR influensa + covid före 1/10 kl 17 (antiviral behandling inom 48 h, T1D = riskgrupp)." },
      { id: "blodprov", text: "Blodprov: CRP + D-dimer (Wells 1,5; PERC ej negativ)." },
      { id: "sputum", text: "Sputumodling före antibiotika." },
      { id: "rontgen", text: "Lungröntgen (ev. revbensbilder/ultraljud) vid kvarstående bröstsmärta/feber." },
      { id: "termometer", text: "Köp termometer; mät temp, puls, SpO2 morgon och kväll." },
      { id: "glukos-ketoner", text: "Glukos + blodketoner var 2–3:e timme under febern; sjukdagsregler." },
      { id: "1177", text: "Skicka 1177-meddelandet till lungmottagningen (sputumodling + DT thorax, dr Runold)." },
      { id: "beta2", text: "Ta upp med lungläkare: flera långverkande beta-2-agonister samtidigt (Anoro, Oxis, Bufomix)." },
      { id: "korrektion", text: "Ta upp med diabetesteamet: ny korrektionsfaktor 1:1,6 (tidigare 1:4,4)." },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap(g => g.items.map(i => i.id));

function loadChecked() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

// Visar `kod` som monospace-chip, resten som vanlig text.
function RichText({ text }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="px-1 py-0.5 rounded bg-secondary text-[12px] font-mono break-all">{part.slice(1, -1)}</code>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function MarcTodo() {
  const [checked, setChecked] = useState(loadChecked);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // Privat läge / blockerad lagring – kryssen gäller då bara tills sidan laddas om.
    }
  }, [checked]);

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const doneCount = ALL_IDS.filter(id => checked[id]).length;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold font-heading flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <ListChecks className="w-4 h-4" />
          Att göra för Marc
        </h2>
        <span className="text-xs text-muted-foreground">{doneCount}/{ALL_IDS.length} klara</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map(group => (
          <div key={group.title}>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <group.icon className="w-3.5 h-3.5 text-amber-500" />
              {group.title}
            </div>
            <div className="space-y-1.5">
              {group.items.map(item => {
                const isDone = !!checked[item.id];
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isDone
                        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : "bg-muted/40 border-border hover:bg-muted/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggle(item.id)}
                      className="sr-only"
                    />
                    <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isDone ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
                    }`}>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className={`text-sm leading-relaxed ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      <RichText text={item.text} />
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
