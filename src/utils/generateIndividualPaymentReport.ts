import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentData {
  id: number;
  user: { id: number; first_name: string; last_name: string };
  payment_type: "enrollment" | "loan" | "anualidad" | "extra" | null;
  course_enrollment_info: {
    id: number;
    course_name: string;
    course_code: string;
    period: number;
    year: number;
  } | null;
  instrument_loan_info: {
    id: number;
    instrument_type: string;
    serial_number: string | null;
  } | null;
  amount: number;
  amount_paid: number | null;
  remaining_amount: number;
  late_due: string;
  status: string;
  is_overdue: boolean;
  note: string | null;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  enrollment: "Mensualidad",
  loan: "Alquiler",
  anualidad: "Matricula",
  extra: "Extra",
};

function formatCurrency(amount: number): string {
  const num = Math.round(amount || 0);
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `CRC ${formatted}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const datePart = dateString.split("T")[0].split(" ")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getDisplayStatus(payment: PaymentData): string {
  if (payment.is_overdue && payment.status !== "completado") return "Vencido";
  const labels: Record<string, string> = {
    "en espera": "En espera",
    completado: "Completado",
    incompleto: "Incompleto",
  };
  return labels[payment.status] || payment.status;
}

function getDescription(p: PaymentData): string {
  if (p.course_enrollment_info) {
    return `${p.course_enrollment_info.course_name}`;
  }
  if (p.instrument_loan_info) {
    return `${p.instrument_loan_info.instrument_type}`;
  }
  if (p.note) return p.note;
  return "--";
}

export async function generateIndividualPaymentReport(
  payments: PaymentData[],
  studentName: string,
  printedBy: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/lobsterlogo.png");
  } catch {
    // skip
  }

  // === HEADER ===
  let y = margin;

  // School name
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Escuela Municipal de", margin, y + 7);
  doc.text("Musica de Cartago", margin, y + 14);

  y += 22;

  // Red accent line
  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 60, y);

  y += 8;

  // Info box: left = student, right = invoice meta
  const boxTop = y;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(margin, boxTop, contentWidth, 28);

  // Vertical divider
  const midX = margin + contentWidth / 2;
  doc.line(midX, boxTop, midX, boxTop + 28);

  // Left: Student info
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 114, 128);
  doc.text("Estudiante", margin + 4, boxTop + 5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(studentName, margin + 4, boxTop + 11);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${payments.length} pago(s) registrado(s)`, margin + 4, boxTop + 16);

  // Overdue count
  const overdueCount = payments.filter(
    (p) => p.is_overdue && p.status !== "completado",
  ).length;
  if (overdueCount > 0) {
    doc.setTextColor(153, 27, 27);
    doc.text(`${overdueCount} pago(s) vencido(s)`, margin + 4, boxTop + 21);
  }

  // Right: Report meta
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 114, 128);
  doc.text("Reporte Individual", midX + 4, boxTop + 5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(`Fecha: ${dateStr}`, midX + 4, boxTop + 11);
  doc.text(`Impreso por: ${printedBy}`, midX + 4, boxTop + 16);

  y = boxTop + 34;

  // === PAYMENT TABLE ===
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Detalle de pagos", margin, y);
  y += 2;

  const rows = payments.map((p, i) => [
    (i + 1).toString(),
    PAYMENT_TYPE_LABELS[p.payment_type || ""] || "--",
    getDescription(p),
    formatDate(p.late_due),
    formatCurrency(p.amount),
    formatCurrency(p.amount_paid || 0),
    formatCurrency(p.remaining_amount),
    getDisplayStatus(p),
  ]);

  const statusColors: Record<string, [number, number, number]> = {
    "en espera": [254, 249, 195],
    completado: [220, 252, 231],
    incompleto: [255, 237, 213],
    vencido: [254, 226, 226],
  };
  const statusTextColors: Record<string, [number, number, number]> = {
    "en espera": [133, 100, 4],
    completado: [22, 101, 52],
    incompleto: [154, 52, 18],
    vencido: [153, 27, 27],
  };

  autoTable(doc, {
    startY: y,
    head: [
      ["#", "Tipo", "Descripcion", "Vencimiento", "Monto", "Pagado", "Restante", "Estado"],
    ],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [55, 65, 81],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 20 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 18, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const display = data.cell.raw as string;
        const key =
          display === "Vencido" ? "vencido" :
          display === "En espera" ? "en espera" :
          display === "Completado" ? "completado" :
          display === "Incompleto" ? "incompleto" : "";
        const bg = statusColors[key];
        const fg = statusTextColors[key];
        if (bg) data.cell.styles.fillColor = bg;
        if (fg) data.cell.styles.textColor = fg;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // === TOTALS BOX (right-aligned, invoice-style) ===
  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalRemaining = payments.reduce((s, p) => s + (p.remaining_amount || 0), 0);
  const totalOverdue = payments
    .filter((p) => p.is_overdue && p.status !== "completado")
    .reduce((s, p) => s + (p.remaining_amount || 0), 0);

  const ensureSpace = (needed: number) => {
    if (pageHeight - y - 15 < needed) {
      doc.addPage();
      y = 18;
    }
  };

  ensureSpace(35);

  const totalsWidth = 80;
  const totalsX = pageWidth - margin - totalsWidth;

  autoTable(doc, {
    startY: y,
    body: [
      ["Monto total", formatCurrency(totalAmount)],
      ["Total pagado", formatCurrency(totalPaid)],
      ["Total pendiente", formatCurrency(totalRemaining)],
      ...(totalOverdue > 0
        ? [["Total vencido", formatCurrency(totalOverdue)]]
        : []),
    ],
    margin: { left: totalsX, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [55, 65, 81],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { halign: "right", cellWidth: totalsWidth - 35 },
    },
    didParseCell: (data) => {
      // Last row (total vencido or total pendiente) gets highlight
      const isLastRow = data.row.index === (totalOverdue > 0 ? 3 : 2);
      if (data.section === "body" && isLastRow) {
        data.cell.styles.fontStyle = "bold";
        if (totalOverdue > 0) {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
        } else {
          data.cell.styles.fillColor = [243, 244, 246];
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // === BREAKDOWN BY TYPE ===
  const byType: Record<string, { count: number; amount: number; paid: number; remaining: number }> = {};
  payments.forEach((p) => {
    const type = p.payment_type || "otro";
    if (!byType[type]) byType[type] = { count: 0, amount: 0, paid: 0, remaining: 0 };
    byType[type].count++;
    byType[type].amount += p.amount || 0;
    byType[type].paid += p.amount_paid || 0;
    byType[type].remaining += p.remaining_amount || 0;
  });

  if (Object.keys(byType).length > 1) {
    ensureSpace(20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen por tipo", margin, y);
    y += 2;

    const typeRows = Object.entries(byType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, data]) => [
        PAYMENT_TYPE_LABELS[type] || type,
        String(data.count),
        formatCurrency(data.amount),
        formatCurrency(data.paid),
        formatCurrency(data.remaining),
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Tipo", "Cant.", "Monto", "Pagado", "Restante"]],
      body: typeRows,
      margin: { left: margin, right: pageWidth / 2 + 10 },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        textColor: [55, 65, 81],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [55, 65, 81],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center", cellWidth: 10 },
        2: { halign: "right", cellWidth: 20 },
        3: { halign: "right", cellWidth: 20 },
        4: { halign: "right", cellWidth: 20 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (logoImg) {
      const logoOrigW = logoImg.naturalWidth;
      const logoOrigH = logoImg.naturalHeight;
      const logoH = 4;
      const logoW = (logoOrigW / logoOrigH) * logoH;
      const logoX = (pageWidth - logoW) / 2;
      doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
      doc.addImage(logoImg, "PNG", logoX, pageHeight - 9, logoW, logoH);
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175);
    doc.text("Valido a la fecha de impresion.", margin, pageHeight - 5);
    doc.text(
      `Pagina ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: "right" },
    );
  }

  const safeName = studentName.replace(/\s+/g, "_").toLowerCase();
  doc.save(`reporte_pagos_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
}
