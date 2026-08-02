import { useState } from "react";
import {
  FlaskConical, ChevronDown, ChevronUp, ArrowRight, MapPin, CheckCircle2,
  ShieldCheck, HelpCircle,
} from "lucide-react";
import { RECOMMENDED_TESTS, RULED_OUT } from "@/data/content";
import StudyRefs from "@/components/health/StudyRefs";

// Utbytet styr färgen. "mycket hög" = gör det här först.
const VALUE_STYLES = {
  "mycket hög": {
    badge: "bg-red-500/20 text-red-400 ring-1 ring-red-500/40",
    border: "border-red-900/60",
    bg: "bg-red-950/20",
    rank: "bg-red-500/20 text-red-300",
  },
  "hög": {
    badge: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40",
    border: "border-amber-900/50",
    bg: "bg-amber-950/15",
    rank: "bg-amber-500/20 text-amber-300",
  },
  "medel": {
    badge: "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30",
    border: "border-border",
    bg: "bg-secondary/30",
    rank: "bg-violet-500/20 text-violet-300",
  },
  "låg": {
    badge: "bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30",
    border: "border-border",
    bg: "bg-secondary/20",
    rank: "bg-slate-500/20 text-slate-300",
  },
};

function TestRow({ test, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const style = VALUE_STYLES[test.value] || VALUE_STYLES.medel;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-3.5 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold font-heading ${style.rank}`}>
          {test.rank}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold leading-snug">{test.name}</span>
          <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
            {test.answers}
          </span>
        </span>
        <span className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${style.badge}`}>
            {test.value.toUpperCase()}
          </span>
          <span className="text-[10px] text-muted-foreground">{test.sample}</span>
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Varför</h5>
            <p className="text-xs leading-relaxed text-muted-foreground">{test.why}</p>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">
              <span className="font-semibold text-primary">Vad svaret ändrar:</span> {test.changes}
            </p>
          </div>

          {test.where && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/70 text-[11px] font-medium text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {test.where}
            </span>
          )}

          <StudyRefs refs={test.study_refs} label="Studier" />
        </div>
      )}
    </div>
  );
}

function RuledOutRow({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="flex-1 text-sm font-medium leading-snug">{item.title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[11px] font-mono text-emerald-300/90 leading-relaxed">{item.finding}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.excludes}</p>
          {item.caveat && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed text-amber-200/90">{item.caveat}</p>
            </div>
          )}
          <StudyRefs refs={item.study_refs} label="Studier" />
        </div>
      )}
    </div>
  );
}

// Rangordnade provrekommendationer med utbyte, plus vad de befintliga
// proverna redan har svarat på så att de inte beställs igen.
export default function RecommendedTests() {
  const [showAll, setShowAll] = useState(false);
  const [showRuledOut, setShowRuledOut] = useState(false);

  const top = RECOMMENDED_TESTS.filter(t => t.value === "mycket hög" || t.value === "hög");
  const visible = showAll ? RECOMMENDED_TESTS : top;
  const rest = RECOMMENDED_TESTS.length - top.length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Prover som bör tas</h3>
            <p className="text-xs text-muted-foreground">
              Rangordnade efter kliniskt utbyte · vad de svarar på och vad svaret ändrar
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-400 shrink-0 whitespace-nowrap">
          {RECOMMENDED_TESTS.filter(t => t.value === "mycket hög").length} högst utbyte
        </span>
      </div>

      <div className="p-4 space-y-2">
        {visible.map((t, i) => (
          <TestRow key={t.rank} test={t} defaultOpen={i < 2} />
        ))}

        {rest > 0 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors"
          >
            {showAll ? "Visa bara de viktigaste" : `Visa alla ${RECOMMENDED_TESTS.length} prover (${rest} till med lägre utbyte)`}
          </button>
        )}

        {/* Redan besvarat */}
        <div className="pt-2">
          <button
            onClick={() => setShowRuledOut(v => !v)}
            className="w-full flex items-center gap-2 py-2 text-left"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold flex-1">
              Redan besvarat av dina prover – ta inte om
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              {RULED_OUT.length}
            </span>
            {showRuledOut
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showRuledOut && (
            <div className="space-y-2 mt-1">
              {RULED_OUT.map(item => (
                <RuledOutRow key={item.title} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
