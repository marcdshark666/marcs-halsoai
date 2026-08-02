import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

export default function TodoList({ labResults, onToggle }) {
  // Find latest abnormal results per test
  const latestByTest = {};
  (labResults || []).forEach(r => {
    const existing = latestByTest[r.test_name];
    if (!existing || new Date(r.sample_date) > new Date(existing.sample_date)) {
      latestByTest[r.test_name] = r;
    }
  });

  const abnormal = Object.values(latestByTest).filter(r => r.status !== "normal");

  // Historical: tests that were abnormal at some point
  const allAbnormal = {};
  (labResults || []).forEach(r => {
    if (r.status !== "normal") {
      if (!allAbnormal[r.test_name]) allAbnormal[r.test_name] = [];
      allAbnormal[r.test_name].push(r);
    }
  });

  const historicalOnly = Object.keys(allAbnormal).filter(name => {
    const latest = latestByTest[name];
    return latest && latest.status === "normal";
  });

  if (abnormal.length === 0 && historicalOnly.length === 0) {
    // Skilj "inga prover alls" från "alla prover normala" – annars ser en tom
    // databas ut som ett friskintyg.
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        {(labResults || []).length === 0
          ? "Inga provsvar inlagda ännu. Utredningsplanen ligger under Kalender & åtgärder."
          : "Alla prover inom referensintervall"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {abnormal.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Aktuellt avvikande — följ upp
          </h4>
          <div className="space-y-1.5">
            {abnormal.map(r => (
              <div key={r.test_name} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/50 border border-red-100 dark:bg-red-950/30 dark:border-red-900">
                <Circle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{r.test_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {r.value} {r.unit} (ref {r.reference_low}–{r.reference_high})
                  </span>
                </div>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium shrink-0">{r.sample_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {historicalOnly.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
            Historiskt avvikande — nu normalt
          </h4>
          <div className="space-y-1.5">
            {historicalOnly.map(name => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Senast normal: {latestByTest[name]?.value} {latestByTest[name]?.unit}
                  </span>
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                  {allAbnormal[name].length} avvikelser
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}