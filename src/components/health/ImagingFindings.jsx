import {
  Brain, Heart, HeartPulse, Droplet, Bone, Eye, Dna, Microscope, ScanLine,
  Activity, Layers, CheckCircle2, AlertTriangle, ShieldCheck, Calendar, Building2,
} from "lucide-react";
import { IMAGING_FINDINGS, IMAGING_SUMMARY } from "@/data/content";

const ICONS = {
  brain: Brain,
  heart: Heart,
  pulse: HeartPulse,
  droplet: Droplet,
  bone: Bone,
  eye: Eye,
  dna: Dna,
  microscope: Microscope,
  scan: ScanLine,
  activity: Activity,
  layers: Layers,
};

const GRADE_CONFIG = {
  normal: {
    label: "Normalfynd",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    accent: "border-l-emerald-500",
    glow: "shadow-emerald-500/5",
  },
  mild: {
    label: "Lindrig avvikelse",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: ShieldCheck,
    iconColor: "text-amber-400",
    accent: "border-l-amber-500",
    glow: "shadow-amber-500/5",
  },
  moderate: {
    label: "Måttlig avvikelse",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
    iconColor: "text-orange-400",
    accent: "border-l-orange-500",
    glow: "shadow-orange-500/5",
  },
};

export default function ImagingFindings() {
  const normalCount = IMAGING_FINDINGS.filter(f => f.grade === "normal").length;
  const abnormalCount = IMAGING_FINDINGS.length - normalCount;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Bilddiagnostik och utredningsfynd</h3>
              <p className="text-xs text-muted-foreground">Ultraljud, endoskopi och laboratorieutredningar – graderade</p>
            </div>
          </div>
          {IMAGING_FINDINGS.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {normalCount} normala
              </span>
              {abnormalCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {abnormalCount} avvikande
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {IMAGING_FINDINGS.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Inga registrerade bildfynd</p>
      ) : (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMAGING_FINDINGS.map(finding => {
            const cfg = GRADE_CONFIG[finding.grade] || GRADE_CONFIG.normal;
            const Icon = ICONS[finding.icon] || Activity;
            const GradeIcon = cfg.icon;

            return (
              <div
                key={finding.id}
                className={`rounded-xl border border-border border-l-4 ${cfg.accent} bg-muted/20 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${cfg.glow}`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{finding.organ}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge} flex items-center gap-1`}>
                        <GradeIcon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold leading-snug">{finding.title}</h4>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{finding.detail}</p>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground min-w-0">
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {finding.date}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{finding.clinic}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary font-mono shrink-0">{finding.metric}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {IMAGING_SUMMARY && (
        <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-start gap-2">
          <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Sammanfattning:</strong> {IMAGING_SUMMARY}
          </p>
        </div>
      )}
    </div>
  );
}
