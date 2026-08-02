import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lightbulb, ShieldAlert, ExternalLink, Pill, PlusCircle, PauseCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import StudyRefs from "@/components/health/StudyRefs";

function MedCard({ med, onActivate, onPause }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
          <Pill className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold">{med.name}</span>
            <span className="text-xs text-muted-foreground">{med.dosage}</span>
          </div>
          {med.drug_class && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wide">{med.drug_class}</span>
          )}
          {med.purpose && <p className="text-xs text-muted-foreground mt-0.5 truncate">{med.purpose}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors"
            title="Visa detaljer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onPause(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-[11px] font-medium"
            title="Sätt som utsatt"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            Utsatt
          </button>
          <button
            onClick={() => onActivate(med)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-[11px] font-medium"
            title="Börja ta – flytta till aktiva"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Ta nu
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {med.recommendation_reason && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300 leading-relaxed">{med.recommendation_reason}</p>
            </div>
          )}
          <StudyRefs refs={med.study_refs} label="Evidens" />
          {med.risk_notes && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-red-500/5 border border-red-500/15">
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
        </div>
      )}
    </div>
  );
}

export default function RecommendedMedications() {
  const queryClient = useQueryClient();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: () => base44.entities.Medication.list(),
  });

  const updateMed = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medications"] }),
  });

  const handleActivate = (med) => updateMed.mutate({ id: med.id, data: { ...med, status: "aktiv", is_active: true } });
  const handlePause = (med) => updateMed.mutate({ id: med.id, data: { ...med, status: "pausad", is_active: false } });

  const recommended = medications.filter(m => m.status === "rekommenderad");

  if (isLoading) return <div className="flex items-center justify-center py-6"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (recommended.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-amber-500/30 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-amber-400/5 border-b border-amber-500/20">
        <div className="p-2 rounded-xl bg-amber-500/20">
          <Lightbulb className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Rekommenderade mediciner</h3>
          <p className="text-xs text-muted-foreground">Bör diskuteras med läkare – tas inte ännu</p>
        </div>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-500">
          {recommended.length} st
        </span>
      </div>
      <div className="p-4 space-y-2">
        {recommended.map(med => (
          <MedCard key={med.id} med={med} onActivate={handleActivate} onPause={handlePause} />
        ))}
      </div>
    </div>
  );
}