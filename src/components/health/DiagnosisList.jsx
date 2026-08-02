import {
  Droplet, Activity, Shield, Eye, HeartPulse, Microscope, Pill, Stethoscope,
} from "lucide-react";
import { DIAGNOSES } from "@/data/content";

const ICONS = {
  droplet: Droplet,
  activity: Activity,
  shield: Shield,
  eye: Eye,
  heart: HeartPulse,
  microscope: Microscope,
  pill: Pill,
  stethoscope: Stethoscope,
};

// Diagnoslistan – kort sammanfattning av vad som är fastställt.
export default function DiagnosisList() {
  if (DIAGNOSES.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Diagnoser och kliniska fynd
      </h3>
      <div className="space-y-2.5">
        {DIAGNOSES.map(d => {
          const Icon = ICONS[d.icon] || Stethoscope;
          return (
            <div key={d.label} className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug">{d.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{d.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
