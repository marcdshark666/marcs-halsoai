import { useState } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CheckCircle2, Calendar, X } from "lucide-react";

export default function CompleteDateModal({ action, onConfirm, onCancel }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-sm font-semibold">Markera som klar</span>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{action.title}</span> — när genomfördes detta?
          </p>

          {/* Quick: today */}
          <button
            onClick={() => setSelectedDate(today)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
              selectedDate === today
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-secondary/40 text-foreground hover:border-emerald-500/40"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Idag</p>
              <p className="text-xs text-muted-foreground">{format(new Date(), "d MMMM yyyy", { locale: sv })}</p>
            </div>
          </button>

          {/* Custom date */}
          <div className={`rounded-xl border transition-all ${
            selectedDate !== today ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-secondary/40"
          }`}>
            <label className="flex items-center gap-3 p-3.5 cursor-pointer">
              <Calendar className={`w-4 h-4 shrink-0 ${selectedDate !== today ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Annat datum</p>
                <p className="text-xs text-muted-foreground">Välj det faktiska datumet</p>
              </div>
            </label>
            <div className="px-3.5 pb-3.5">
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={e => setSelectedDate(e.target.value)}
                onFocus={() => setSelectedDate(selectedDate !== today ? selectedDate : format(new Date(action.due_date), "yyyy-MM-dd"))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={() => onConfirm(selectedDate)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Markera klar
          </button>
        </div>
      </div>
    </div>
  );
}