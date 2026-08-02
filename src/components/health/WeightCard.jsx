import { TrendingDown, Scale } from "lucide-react";
import { WEIGHT } from "@/data/content";

// Viktkortet ersätter hjärtfrekvenskortet i den här appen: viktnedgången är
// den mätbara varningssignalen i hela den kliniska bilden. Kurvan ritas från
// WEIGHT.points i content.js – lägg in uppmätta värden där.
export default function WeightCard() {
  const { start_kg, current_low_kg, current_high_kg, months, note, points = [] } = WEIGHT;

  const currentMid = (current_low_kg + current_high_kg) / 2;
  const lossHigh = start_kg - current_low_kg;
  const lossLow = start_kg - current_high_kg;
  const pctLow = ((lossLow / start_kg) * 100).toFixed(0);
  const pctHigh = ((lossHigh / start_kg) * 100).toFixed(0);

  // Enkel sparkline utan externt bibliotek.
  const W = 220;
  const H = 56;
  const values = points.length >= 2 ? points.map(p => p.kg) : [start_kg, currentMid];
  const min = Math.min(...values) - 0.8;
  const max = Math.max(...values) + 0.8;
  const span = max - min || 1;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / span) * H;
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vikt</span>
        <Scale className="w-4 h-4 text-teal-400" />
      </div>

      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-heading leading-none">
          {current_low_kg}–{current_high_kg}
        </span>
        <span className="text-sm text-muted-foreground mb-0.5">kg</span>
        <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-rose-400 mb-0.5">
          <TrendingDown className="w-4 h-4" />
          −{lossLow}–{lossHigh} kg
        </span>
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        Från {start_kg} kg · {pctLow}–{pctHigh} % på {months} månader
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14 mt-3" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#weightFill)" />
        <path d={line} fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#2DD4BF" />
        ))}
      </svg>

      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{note}</p>
    </div>
  );
}
