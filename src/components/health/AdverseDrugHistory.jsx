import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertOctagon, Plus, X, Clock, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

const SEVERITY_STYLES = {
  lindrig: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  måttlig: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  allvarlig: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "mycket allvarlig": "bg-red-500/15 text-red-400 border-red-500/20",
};

function AdverseCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[record.severity || "måttlig"] || SEVERITY_STYLES.måttlig;

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-orange-500/8 transition-colors"
      >
        <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400 shrink-0">
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{record.drug_name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sev}`}>{record.severity || "måttlig"}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{record.reaction}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pl-10 space-y-2 text-xs">
          {record.date_period && (
            <p className="text-muted-foreground"><span className="font-semibold text-foreground">Period:</span> {record.date_period}</p>
          )}
          {record.action_taken && (
            <p className="text-muted-foreground"><span className="font-semibold text-foreground">Åtgärd:</span> {record.action_taken}</p>
          )}
          {record.future_consideration && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Clock className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-violet-300 leading-relaxed">
                <span className="font-semibold">Framtida ställningstagande:</span> {record.future_consideration}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddForm({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    drug_name: "", reaction: "", date_period: "", severity: "måttlig", action_taken: "", future_consideration: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AdverseDrugHistory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adverseDrugHistory"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.drug_name || !form.reaction) return;
    createMutation.mutate(form);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Ny biverkningsregistrering</h4>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Läkemedel" value={form.drug_name} onChange={e => setForm({ ...form, drug_name: e.target.value })} />
        <select className={inputCls} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
          <option value="lindrig">Lindrig</option>
          <option value="måttlig">Måttlig</option>
          <option value="allvarlig">Allvarlig</option>
          <option value="mycket allvarlig">Mycket allvarlig</option>
        </select>
      </div>
      <input className={inputCls} placeholder="Biverkning" value={form.reaction} onChange={e => setForm({ ...form, reaction: e.target.value })} />
      <input className={inputCls} placeholder="Datum/tidsperiod" value={form.date_period} onChange={e => setForm({ ...form, date_period: e.target.value })} />
      <input className={inputCls} placeholder="Åtgärd vidtagen" value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} />
      <textarea className={inputCls} rows={2} placeholder="Framtida ställningstagande – när kan läkemedlet omprövas?" value={form.future_consideration} onChange={e => setForm({ ...form, future_consideration: e.target.value })} />
      <button type="submit" disabled={createMutation.isPending} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {createMutation.isPending ? "Sparar..." : "Spara"}
      </button>
    </form>
  );
}

export default function AdverseDrugHistory() {
  const [showForm, setShowForm] = useState(false);
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["adverseDrugHistory"],
    queryFn: () => base44.entities.AdverseDrugHistory.list("-created_date", 50),
  });

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/20">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Tidigare biverkningshistorik</h3>
            <p className="text-xs text-muted-foreground">Registrerade läkemedelsreaktioner och framtida ställningstaganden</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-xs font-medium">
          <Plus className="w-3.5 h-3.5" />
          Lägg till
        </button>
      </div>
      <div className="p-4 space-y-2">
        {showForm && <AddForm onClose={() => setShowForm(false)} />}
        {isLoading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : records.length === 0 && !showForm ? (
          <p className="text-center py-4 text-sm text-muted-foreground">Inga registrerade biverkningar</p>
        ) : (
          records.map(r => <AdverseCard key={r.id} record={r} />)
        )}
      </div>
    </div>
  );
}