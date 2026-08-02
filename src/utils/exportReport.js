// Genererar en nedladdningsbar hälsorapport (PDF) med jsPDF.
// Innehåll: avvikande prover, alla senaste värden, mediciner, planerade åtgärder.
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { formatRef } from "@/utils/labNormalizer";
import { APP_NAME } from "@/data/content";

const STATUS_LABELS = {
  normal: "Normal",
  low: "Lågt",
  high: "Högt",
  critical_low: "KRITISKT LÅGT",
  critical_high: "KRITISKT HÖGT",
};

const MARGIN = 14;
const LINE = 5.5;

export function exportHealthReport({ labResults = [], medications = [], upcomingActions = [], journalEntries = [], latestByTest = {} }) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  const ensureSpace = (needed = LINE) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text) => {
    ensureSpace(12);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(text, MARGIN, y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE;
  };

  const row = (text, { bold = false, color = [60, 60, 60], indent = 0 } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageWidth - MARGIN * 2 - indent);
    lines.forEach((line) => {
      ensureSpace();
      doc.text(line, MARGIN + indent, y);
      y += LINE;
    });
  };

  // Titel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(`Hälsorapport – ${APP_NAME}`, MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Genererad ${format(new Date(), "d MMMM yyyy 'kl.' HH:mm", { locale: sv })}`, MARGIN, y);
  y += 4;

  const latest = Object.entries(latestByTest);
  const abnormal = latest.filter(([, r]) => r.status !== "normal");

  // Sammanfattning
  heading("Sammanfattning");
  row(`Unika tester: ${latest.length}   ·   Mätningar totalt: ${labResults.length}   ·   Avvikande: ${abnormal.length}`);
  row(`Aktiva mediciner: ${medications.filter((m) => m.status === "aktiv").length}   ·   Planerade åtgärder: ${upcomingActions.filter((a) => !a.is_completed).length}   ·   Journalanteckningar: ${journalEntries.length}`);

  // Avvikande värden
  heading(`Avvikande provsvar (${abnormal.length})`);
  if (abnormal.length === 0) {
    row("Alla senaste provsvar ligger inom referensintervallen.", { color: [22, 130, 80] });
  }
  abnormal
    .sort(([, a], [, b]) => (a.status.startsWith("critical") ? -1 : 1) - (b.status.startsWith("critical") ? -1 : 1))
    .forEach(([name, r]) => {
      const isCritical = r.status.startsWith("critical");
      row(
        `${name}: ${r.value} ${r.unit || ""}  (ref ${formatRef(r.reference_low, r.reference_high)})  ${STATUS_LABELS[r.status] || r.status}  ·  ${r.sample_date}`,
        { bold: isCritical, color: isCritical ? [180, 30, 30] : [200, 120, 20] }
      );
      if (r.notes) row(`Anm: ${r.notes}`, { indent: 4, color: [110, 110, 110] });
    });

  // Alla senaste värden
  heading("Samtliga senaste provsvar");
  latest
    .sort(([a], [b]) => a.localeCompare(b, "sv"))
    .forEach(([name, r]) => {
      row(`${name}: ${r.value} ${r.unit || ""}  (ref ${formatRef(r.reference_low, r.reference_high)})  ${STATUS_LABELS[r.status] || r.status}  ·  ${r.sample_date}`);
    });

  // Mediciner
  heading("Läkemedel");
  const medGroups = [
    ["Aktiva", medications.filter((m) => m.status === "aktiv")],
    ["Pausade/utsatta", medications.filter((m) => m.status === "pausad")],
    ["Rekommenderade", medications.filter((m) => m.status === "rekommenderad")],
  ];
  medGroups.forEach(([label, meds]) => {
    if (meds.length === 0) return;
    row(`${label}:`, { bold: true });
    meds.forEach((m) => {
      row(`• ${m.name} ${m.dosage}${m.times_of_day?.length ? ` (${m.times_of_day.join(", ")})` : ""}${m.purpose ? ` – ${m.purpose}` : ""}`, { indent: 4 });
      if (m.paused_reason) row(`Orsak: ${m.paused_reason}`, { indent: 8, color: [110, 110, 110] });
      if (m.recommendation_reason) row(`Motivering: ${m.recommendation_reason}`, { indent: 8, color: [110, 110, 110] });
    });
  });

  // Planerade åtgärder
  const pending = upcomingActions.filter((a) => !a.is_completed).sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
  heading(`Planerade åtgärder (${pending.length})`);
  const today = format(new Date(), "yyyy-MM-dd");
  pending.forEach((a) => {
    const overdue = a.due_date < today;
    row(`${a.due_date}${overdue ? "  FÖRSENAD" : ""}  ·  ${a.title}  [${a.type || "åtgärd"}, prioritet: ${a.priority || "medel"}]`, {
      bold: overdue,
      color: overdue ? [180, 30, 30] : [60, 60, 60],
    });
    if (a.description) row(a.description, { indent: 4, color: [110, 110, 110] });
  });

  // Sidfot med sidnummer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${APP_NAME} · sida ${i} av ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: "center" });
  }

  doc.save(`halsorapport-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
