import { Pill, Eye, FlaskConical, Syringe, HeartPulse, Activity, Shield, ClipboardList } from "lucide-react";
import { TREATMENT_PLAN } from "@/data/content";

// Ikonnycklarna kommer från content.js så att innehållet kan redigeras utan
// att komponenten behöver importera nya ikoner.
const ICONS = {
  pill: Pill,
  eye: Eye,
  flask: FlaskConical,
  syringe: Syringe,
  heart: HeartPulse,
  activity: Activity,
  shield: Shield,
};

export default function TreatmentPlan() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <h3 className="text-base font-semibold">Rekommenderad handlingsplan</h3>
        <p className="text-xs text-muted-foreground">Sammanställd ur journalen och gällande riktlinjer – underlag för nästa läkarbesök</p>
      </div>

      {TREATMENT_PLAN.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <ClipboardList className="w-6 h-6 opacity-50" />
          <p className="text-sm">Ingen handlingsplan ifylld ännu</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Åtgärd</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detaljer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Ref</th>
              </tr>
            </thead>
            <tbody>
              {TREATMENT_PLAN.map((row, i) => {
                const Icon = ICONS[row.icon] || Pill;
                return (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${row.color} shrink-0`} />
                        <span className="font-medium">{row.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">{row.details}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">{row.ref}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
