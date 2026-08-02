import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pill, Sun, Moon, Coffee, BedDouble, AlertCircle, ExternalLink, ShieldAlert, PauseCircle, Lightbulb, RotateCcw } from "lucide-react";
import StudyRefs from "@/components/health/StudyRefs";

const TIME_SLOTS = [
  { key: "morgon", label: "Morgon", icon: Sun, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "lunch", label: "Lunch", icon: Coffee, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { key: "kväll", label: "Kväll", icon: Moon, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { key: "natt", label: "Natt", icon: BedDouble, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { key: "vid behov", label: "Vid behov", icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
];

function MedicationCard({ med, slot, onPause, onRecommend }) {
  return (
    <div className={`p-2.5 rounded-lg border ${slot.bg} ${slot.border}`}>
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg bg-white/5 ${slot.color} shrink-0`}>
          <Pill className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold truncate">{med.name}</span>
            <span className="text-xs text-muted-foreground">{med.dosage}</span>
          </div>
          {med.drug_class && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/8 text-muted-foreground uppercase tracking-wide">{med.drug_class}</span>
          )}
          {med.purpose && <p className="text-xs text-muted-foreground truncate">{med.purpose}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onRecommend(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-[11px] font-medium"
            title="Flytta till rekommenderad"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Rekommen.
          </button>
          <button
            onClick={() => onPause(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-[11px] font-medium"
            title="Sätt som utsatt"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            Utsätt
          </button>
        </div>
      </div>
      {med.instructions && (
        <p className="text-[10px] text-muted-foreground italic mt-1 ml-9">{med.instructions}</p>
      )}
      {med.risk_notes && (
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-red-500/5 border border-red-500/15">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{med.risk_notes}</p>
            {med.risk_source_url && (
              <a href={med.risk_source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary hover:underline">
                {med.risk_source_label || "Läs mer"}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      )}
      <StudyRefs refs={med.study_refs} label="Evidens" />
    </div>
  );
}

function PausedCard({ med, onActivate, onRecommend }) {
  return (
    <div className="p-2.5 rounded-lg border bg-orange-500/10 border-orange-500/20">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-white/5 text-orange-400 shrink-0">
          <Pill className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold truncate">{med.name}</span>
            <span className="text-xs text-muted-foreground">{med.dosage}</span>
          </div>
          {med.drug_class && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/8 text-muted-foreground uppercase tracking-wide">{med.drug_class}</span>
          )}
          {med.purpose && <p className="text-xs text-muted-foreground truncate">{med.purpose}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onRecommend(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-[11px] font-medium"
            title="Flytta till rekommenderad"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Rekommen.
          </button>
          <button
            onClick={() => onActivate(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-[11px] font-medium"
            title="Återuppta – flytta till aktiva"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Återuppta
          </button>
        </div>
      </div>
      {med.paused_reason && (
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
          <PauseCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-orange-300 leading-relaxed">{med.paused_reason}</p>
        </div>
      )}
    </div>
  );
}

export default function MedicationList() {
  const queryClient = useQueryClient();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: () => base44.entities.Medication.list(),
  });

  const updateMed = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medications"] }),
  });

  const handlePause = (med) => updateMed.mutate({ id: med.id, data: { ...med, status: "pausad", is_active: false } });
  const handleActivate = (med) => updateMed.mutate({ id: med.id, data: { ...med, status: "aktiv", is_active: true } });
  const handleRecommend = (med) => updateMed.mutate({ id: med.id, data: { ...med, status: "rekommenderad", is_active: false } });

  const active = medications.filter(m => m.status === "aktiv" || (m.is_active === true && !m.status));
  const paused = medications.filter(m => m.status === "pausad" || (m.is_active === false && m.status !== "rekommenderad" && !m.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (active.length === 0 && paused.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Inga mediciner registrerade</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {TIME_SLOTS.map(slot => {
        const meds = active.filter(m => (m.times_of_day || []).includes(slot.key));
        if (meds.length === 0) return null;
        const Icon = slot.icon;
        return (
          <div key={slot.key}>
            <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${slot.color}`}>
              <Icon className="w-3.5 h-3.5" />
              {slot.label}
            </div>
            <div className="space-y-1.5">
              {meds.map(med => (
                <MedicationCard key={med.id} med={med} slot={slot} onPause={handlePause} onRecommend={handleRecommend} />
              ))}
            </div>
          </div>
        );
      })}

      {paused.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
            <PauseCircle className="w-3.5 h-3.5" />
            Utsatta / Pausade
          </div>
          <div className="space-y-1.5">
            {paused.map(med => (
              <PausedCard key={med.id} med={med} onActivate={handleActivate} onRecommend={handleRecommend} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}