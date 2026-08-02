import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Clock, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { formatRef } from "@/utils/labNormalizer";

const STATUS_COLORS = {
  normal: "text-emerald-400",
  high: "text-amber-400",
  low: "text-amber-400",
  critical_high: "text-red-400",
  critical_low: "text-red-400",
};

const STATUS_LABELS = {
  normal: "Normal",
  high: "Hög",
  low: "Låg",
  critical_high: "Kritiskt hög",
  critical_low: "Kritiskt låg",
};

const DOT_STATUS_COLORS = {
  normal: "hsl(160, 60%, 45%)",
  low: "hsl(45, 90%, 55%)",
  high: "hsl(45, 90%, 55%)",
  critical_low: "hsl(0, 72%, 55%)",
  critical_high: "hsl(0, 72%, 55%)",
};

// Punkter färgade per mätnings status – avvikande värden syns direkt i grafen.
function StatusDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = DOT_STATUS_COLORS[payload.status] || DOT_STATUS_COLORS.normal;
  return <circle cx={cx} cy={cy} r={5} fill="hsl(240, 6%, 11%)" stroke={color} strokeWidth={2} />;
}

export default function TrendChart({ data, testName, refLow, refHigh, unit, onClose }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Ingen data att visa
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => new Date(a.sample_date) - new Date(b.sample_date));
  const chartData = sorted.map(d => ({
    date: d.sample_date,
    value: d.value,
    status: d.status || "normal",
    label: format(new Date(d.sample_date), "d MMM yyyy", { locale: sv }),
  }));

  const allValues = chartData.map(d => d.value);
  // ?? i stället för || så att referensgräns 0 inte ignoreras
  const rawMin = Math.min(...allValues, refLow ?? Infinity);
  const rawMax = Math.max(...allValues, refHigh ?? -Infinity);
  const pad = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.15;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const unitLabel = unit ?? "";

  const firstValue = chartData[0];
  const lastValue = chartData[chartData.length - 1];
  const delta = lastValue.value - firstValue.value;
  const deltaPercent = firstValue.value !== 0 ? ((delta / Math.abs(firstValue.value)) * 100).toFixed(1) : "0";
  const isIncrease = delta > 0;
  const isUnchanged = delta === 0;

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{testName}</h3>
          <p className="text-sm text-muted-foreground">
            Referensintervall: {formatRef(refLow, refHigh)} {unit}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <span className="text-xs text-muted-foreground font-mono block">
              {chartData.length} mätningar
            </span>
            {chartData.length > 1 && (
              <span className={`text-xs font-semibold ${isUnchanged ? "text-muted-foreground" : isIncrease ? "text-red-400" : "text-emerald-400"}`}>
                {isUnchanged ? "→" : isIncrease ? "↑" : "↓"} {Math.abs(delta).toFixed(1)} {unitLabel} ({Math.abs(deltaPercent)}%)
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Stäng trendvyn"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 18%)" />
          <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(240, 5%, 60%)" }}
          tickLine={false}
          axisLine={false}
          />
          <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: "hsl(240, 5%, 60%)" }}
          tickLine={false}
          axisLine={false}
          width={45}
          />
          <Tooltip
          contentStyle={{
            backgroundColor: "hsl(240, 6%, 11%)",
            border: "1px solid hsl(240, 6%, 18%)",
            borderRadius: "12px",
            fontSize: "13px",
            color: "hsl(0, 0%, 95%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
            formatter={(value) => [`${value} ${unitLabel}`, testName]}
          />
          {/* Referensband: skuggat område gör avvikande punkter direkt synliga */}
          {refLow != null && refHigh != null && (
            <ReferenceArea y1={refLow} y2={refHigh} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
          )}
          {refLow == null && refHigh != null && (
            <ReferenceArea y1={yMin} y2={refHigh} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
          )}
          {refLow != null && refHigh == null && (
            <ReferenceArea y1={refLow} y2={yMax} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
          )}
          {refLow != null && (
            <ReferenceLine y={refLow} stroke="hsl(160, 60%, 42%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Min", position: "left", fontSize: 10, fill: "hsl(160, 60%, 42%)" }} />
          )}
          {refHigh != null && (
            <ReferenceLine y={refHigh} stroke="hsl(0, 72%, 51%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Max", position: "left", fontSize: 10, fill: "hsl(0, 72%, 51%)" }} />
          )}
          <Area type="monotone" dataKey="value" fill="url(#valueGradient)" stroke="none" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(211, 100%, 50%)"
            strokeWidth={2.5}
            dot={<StatusDot />}
            activeDot={{ r: 7, stroke: "hsl(211, 100%, 50%)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* History table — all previous values */}
      {sorted.length > 1 && (
        <div className="mt-5 pt-4 border-t border-border">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Tidigare värden ({sorted.length})
          </h4>
          <div className="space-y-1.5">
            {[...sorted].reverse().map((d, i) => {
              const isLatest = i === 0;
              const isFirst = i === sorted.length - 1;
              const status = d.status || "normal";
              const statusColor = STATUS_COLORS[status] || "text-muted-foreground";
              const statusLabel = STATUS_LABELS[status] || status;

              // Calculate change vs previous entry (which is chronologically earlier since we reversed)
              const prevEntry = sorted[sorted.length - 1 - i - 1];
              let changeIcon = null;
              let changeText = "";
              if (prevEntry && !isFirst) {
                const diff = d.value - prevEntry.value;
                if (diff > 0) { changeIcon = <TrendingUp className="w-3 h-3 text-red-400" />; changeText = `+${diff.toFixed(1)}`; }
                else if (diff < 0) { changeIcon = <TrendingDown className="w-3 h-3 text-emerald-400" />; changeText = `${diff.toFixed(1)}`; }
                else { changeIcon = <Minus className="w-3 h-3 text-muted-foreground" />; changeText = "±0"; }
              }

              return (
                <div
                  key={d.id || i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${isLatest ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20"}`}
                >
                  <span className="text-xs text-muted-foreground font-mono min-w-[100px]">
                    {format(new Date(d.sample_date), "d MMM yyyy", { locale: sv })}
                  </span>
                  <span className="text-sm font-bold min-w-[70px]">
                    {d.value} <span className="text-xs font-normal text-muted-foreground">{d.unit || unit}</span>
                  </span>
                  <span className={`text-xs font-medium ${statusColor} min-w-[60px]`}>
                    {statusLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    {changeIcon}
                    {changeText && `${changeText} ${d.unit || unit}`}
                    {isLatest && <span className="text-[10px] font-bold text-primary ml-1">SENAST</span>}
                  </span>
                  {(refLow != null || refHigh != null) && (
                    <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                      ref {formatRef(refLow, refHigh)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}