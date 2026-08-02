import { useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, Eye, ChevronDown, ChevronUp, ArrowRight, CalendarClock, LineChart } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CLINICAL_PRIORITIES } from "@/data/content";
import StudyRefs from "@/components/health/StudyRefs";

const SEVERITY_STYLES = {
  akut: {
    label: "AKUT",
    icon: AlertOctagon,
    badge: "bg-red-500/20 text-red-400 ring-1 ring-red-500/40",
    border: "border-red-900/60",
    bg: "bg-red-950/25",
    iconColor: "text-red-400",
  },
  hög: {
    label: "HÖG",
    icon: AlertTriangle,
    badge: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40",
    border: "border-amber-900/50",
    bg: "bg-amber-950/15",
    iconColor: "text-amber-400",
  },
  medel: {
    label: "MEDEL",
    icon: Eye,
    badge: "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30",
    border: "border-border",
    bg: "bg-secondary/30",
    iconColor: "text-violet-400",
  },
};

// Hittar öppna åtgärder som hör till prioriteringen via nyckelord i titeln.
function matchActions(priority, actions) {
  if (!priority.action_match?.length) return [];
  return actions
    .filter((a) => !a.is_completed)
    .filter((a) => priority.action_match.some((kw) => a.title.toLowerCase().includes(kw.toLowerCase())))
    .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
    .slice(0, 3);
}

function PriorityItem({ priority, actions, onSelectTest, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const style = SEVERITY_STYLES[priority.severity] || SEVERITY_STYLES.medel;
  const Icon = style.icon;
  const linkedActions = useMemo(() => matchActions(priority, actions), [priority, actions]);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={`w-5 h-5 shrink-0 ${style.iconColor}`} />
        <span className="flex-1 text-sm font-semibold leading-snug">{priority.title}</span>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">{priority.why}</p>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed"><span className="font-semibold text-primary">Nästa steg:</span> {priority.next_step}</p>
          </div>

          <StudyRefs refs={priority.study_refs} />

          {linkedActions.length > 0 && (
            <div className="space-y-1">
              {linkedActions.map((a) => {
                const overdue = a.due_date < today;
                return (
                  <div key={a.id} className="flex items-center gap-2 text-[11px]">
                    <CalendarClock className={`w-3 h-3 shrink-0 ${overdue ? "text-red-400" : "text-muted-foreground"}`} />
                    <span className={`font-mono shrink-0 ${overdue ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                      {format(new Date(a.due_date), "d MMM", { locale: sv })}
                      {overdue && " · försenad"}
                    </span>
                    <span className="text-muted-foreground truncate">{a.title}</span>
                  </div>
                );
              })}
            </div>
          )}

          {priority.related_tests?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <LineChart className="w-3 h-3 text-muted-foreground" />
              {priority.related_tests.map((t) => (
                <button
                  key={t}
                  onClick={() => onSelectTest?.(t)}
                  className="px-2 py-0.5 rounded-md bg-secondary/70 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title={`Visa trend för ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// "Viktigast att bevaka nu" – klinisk prioriteringspanel härledd ur patientens
// riktiga data. Akuta punkter expanderade som standard, resten hopfällda.
export default function PriorityWatch({ upcomingActions = [], onSelectTest }) {
  const [showAll, setShowAll] = useState(false);
  const acute = CLINICAL_PRIORITIES.filter((p) => p.severity === "akut");
  const rest = CLINICAL_PRIORITIES.filter((p) => p.severity !== "akut");
  const visible = showAll ? CLINICAL_PRIORITIES : acute;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/20">
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Viktigast att bevaka nu</h3>
            <p className="text-xs text-muted-foreground">
              Prioritering ur klinisk bild och aktuell evidens · {format(new Date(), "d MMMM yyyy", { locale: sv })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-400">{acute.length} akuta</span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400">
            {CLINICAL_PRIORITIES.filter((p) => p.severity === "hög").length} höga
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {CLINICAL_PRIORITIES.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Inga prioriteringar inlagda</p>
        )}
        {visible.map((p, i) => (
          <PriorityItem
            key={p.title}
            priority={p}
            actions={upcomingActions}
            onSelectTest={onSelectTest}
            defaultOpen={p.severity === "akut" && i < 2}
          />
        ))}

        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors"
        >
          {showAll ? "Visa endast akuta" : `Visa alla ${CLINICAL_PRIORITIES.length} prioriteringar (${rest.length} till)`}
        </button>
      </div>
    </div>
  );
}
