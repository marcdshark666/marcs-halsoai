import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Mic, Square, X, Plus, Keyboard, CheckCircle2, MapPin } from "lucide-react";
import { parseSpokenAction } from "@/utils/voiceActionParser";

const EMPTY_FORM = { title: "", due_date: "", type: "besök", priority: "medel", location: "", description: "" };

// AI-assistent i navigeringens hörn: spela in (eller skriv) det som ska in i
// åtgärdslistan. Transkriptet visas ordagrant, tolkningen förifyller fälten
// och användaren granskar innan något sparas.
export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("idle"); // idle | recording | review | saved
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [speechSupported] = useState(() =>
    typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const queryClient = useQueryClient();

  const addAction = useMutation({
    mutationFn: (data) => base44.entities.UpcomingAction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upcomingActions"] }),
  });

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "sv-SE";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      transcriptRef.current = finalText;
      setTranscript(finalText);
      setInterim(interimText);
    };
    rec.onerror = () => stopRecording();
    rec.onend = () => {
      // Chrome avslutar ibland själv efter tystnad
      if (recognitionRef.current === rec) finishRecording();
    };

    recognitionRef.current = rec;
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    setMode("recording");
    rec.start();
  };

  const finishRecording = () => {
    const text = transcriptRef.current.trim();
    recognitionRef.current = null;
    if (!text) {
      setMode("idle");
      return;
    }
    const parsed = parseSpokenAction(text);
    setForm(parsed);
    setMode("review");
  };

  const stopRecording = () => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop?.();
    // onend triggar inte alltid när vi själva stoppar
    setTimeout(() => {
      if (mode === "recording" || transcriptRef.current) {
        const text = transcriptRef.current.trim();
        if (text) {
          setForm(parseSpokenAction(text));
          setMode("review");
        } else {
          setMode("idle");
        }
      }
    }, 150);
  };

  const startManual = () => {
    setTranscript("");
    setInterim("");
    setForm({ ...EMPTY_FORM, due_date: new Date().toISOString().slice(0, 10) });
    setMode("review");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date) return;
    await addAction.mutateAsync({
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.due_date,
      type: form.type,
      priority: form.priority,
      location: form.location.trim() || undefined,
      is_completed: false,
    });
    setMode("saved");
    setTimeout(() => {
      setMode("idle");
      setOpen(false);
    }, 1600);
  };

  const close = () => {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setOpen(false);
    setMode("idle");
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      {/* AI-knappen högst upp i hörnet */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all"
        title="AI-assistent – tala in det som ska läggas till i listan"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI</span>
        <Mic className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600/20 to-primary/20 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">AI-assistent</h3>
                  <p className="text-xs text-muted-foreground">Tala in eller skriv – granska – lägg till i listan</p>
                </div>
              </div>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {mode === "idle" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  {speechSupported ? (
                    <>
                      <button
                        onClick={startRecording}
                        className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all group"
                      >
                        <div className="p-5 rounded-full bg-gradient-to-r from-violet-600 to-primary shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
                          <Mic className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm font-semibold">Tryck och börja tala</span>
                        <span className="text-xs text-muted-foreground">t.ex. "Om en vecka, venografi med PET-FDG"</span>
                      </button>
                      <button onClick={startManual} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Keyboard className="w-3.5 h-3.5" />
                        Skriv manuellt i stället
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">Röstinspelning stöds inte i denna webbläsare (prova Chrome).</p>
                      <button onClick={startManual} className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
                        <Keyboard className="w-4 h-4" />
                        Lägg till manuellt
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "recording" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    <div className="relative p-5 rounded-full bg-red-500 shadow-lg shadow-red-500/40">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-400">Spelar in… tala nu</p>
                  <div className="w-full min-h-[64px] p-3 rounded-xl bg-secondary/50 border border-border text-sm leading-relaxed">
                    {transcript}
                    <span className="text-muted-foreground italic">{interim}</span>
                    {!transcript && !interim && <span className="text-muted-foreground italic">Lyssnar…</span>}
                  </div>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold text-sm transition-colors"
                  >
                    <Square className="w-4 h-4" fill="currentColor" />
                    Stoppa & tolka
                  </button>
                </div>
              )}

              {mode === "review" && (
                <div className="space-y-3">
                  {transcript && (
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Inspelat (ordagrant)</p>
                      <p className="text-sm leading-relaxed">"{transcript}"</p>
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titel</label>
                    <input value={form.title} onChange={set("title")} autoFocus={!transcript}
                      placeholder="Vad ska göras?"
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Datum</label>
                      <input type="date" value={form.due_date} onChange={set("due_date")}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Plats</label>
                      <input value={form.location} onChange={set("location")} placeholder="t.ex. Sollentuna fysiologi"
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Typ</label>
                      <select value={form.type} onChange={set("type")}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50">
                        {["blodprov", "undersökning", "besök", "remiss", "recept"].map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Prioritet</label>
                      <select value={form.priority} onChange={set("priority")}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50">
                        {["akut", "hög", "medel", "låg"].map((p) => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Beskrivning</label>
                    <textarea value={form.description} onChange={set("description")} rows={2}
                      placeholder="Detaljer…"
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm leading-relaxed focus:outline-none focus:border-primary/50 resize-y" />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={!form.title.trim() || !form.due_date || addAction.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 disabled:opacity-40 disabled:shadow-none transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Lägg till i listan
                    </button>
                    {speechSupported && (
                      <button onClick={startRecording} title="Spela in igen"
                        className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === "saved" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="p-4 rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold">Tillagd i listan!</p>
                  {form.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {form.location}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
