// jspdf is heavy (~350 kB gzipped with autotable); load it only when a
// report is actually generated instead of shipping it in the page bundle.
type JsPDFModule = typeof import("jspdf");
type AutoTableModule = typeof import("jspdf-autotable");
let jsPDF: JsPDFModule["default"];
let autoTable: AutoTableModule["default"];

async function ensurePdfLibs(): Promise<void> {
  if (!jsPDF) {
    const [jspdfMod, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    jsPDF = jspdfMod.default;
    autoTable = autoTableMod.default;
  }
}

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

interface FilterLabels {
  year: string;
  period: string;
  paymentType: string;
  status: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  enrollment: "Mensualidad",
  loan: "Alquiler",
  anualidad: "Matrícula",
  extra: "Extra",
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  "en espera": [254, 249, 195],
  completado: [220, 252, 231],
  incompleto: [255, 237, 213],
  vencido: [254, 226, 226],
};

const STATUS_TEXT_COLORS: Record<string, [number, number, number]> = {
  "en espera": [133, 100, 4],
  completado: [22, 101, 52],
  incompleto: [154, 52, 18],
  vencido: [153, 27, 27],
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
  if (payment.is_overdue && payment.status !== "completado") return "Pendiente";
  const labels: Record<string, string> = {
    "en espera": "En espera",
    completado: "Pagado",
    incompleto: "Incompleto",
  };
  return labels[payment.status] || payment.status;
}

function getStatusKey(payment: PaymentData): string {
  if (payment.is_overdue && payment.status !== "completado") return "vencido";
  return payment.status;
}

export async function generatePaymentReport(
  payments: PaymentData[],
  filters: FilterLabels,
  userName: string,
): Promise<void> {
  await ensurePdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/lobsterlogo.png");
  } catch {
    // Logo won't render if it can't be loaded
  }

  const drawHeader = () => {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Escuela Municipal de Música de Cartago", margin, 18);

    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(margin, 22, margin + 80, 22);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha: ${dateStr}`, margin, 27);
    doc.text(`Impreso por: ${userName}`, margin, 31);

    const filtersY = 37;
    const labels = [
      { key: "Año", value: filters.year },
      { key: "Período", value: filters.period },
      { key: "Tipo", value: filters.paymentType },
      { key: "Estado", value: filters.status },
    ];

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("FILTROS APLICADOS", margin, filtersY);

    let xPos = margin;
    const pillY = filtersY + 2;
    labels.forEach((f) => {
      const text = `${f.key}: ${f.value}`;
      const textWidth = doc.getTextWidth(text);
      const pillWidth = textWidth + 5;
      const pillHeight = 5;

      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(xPos, pillY, pillWidth, pillHeight, 1, 1, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.text(text, xPos + 2.5, pillY + 3.5);

      xPos += pillWidth + 3;
    });
  };

  const drawFooter = () => {
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
      doc.text("Válido a la fecha de impresión.", margin, pageHeight - 5);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 5,
        { align: "right" },
      );
    }
  };

  drawHeader();

  let startY = 48;

  // --- Main payments table ---
  const getDescription = (p: PaymentData): string => {
    if (p.course_enrollment_info) {
      return `${p.course_enrollment_info.course_code} - ${p.course_enrollment_info.course_name}`;
    }
    if (p.instrument_loan_info) {
      const sn = p.instrument_loan_info.serial_number
        ? ` (${p.instrument_loan_info.serial_number})`
        : "";
      return `${p.instrument_loan_info.instrument_type}${sn}`;
    }
    if (p.note) return p.note;
    return "—";
  };

  if (payments.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`Pagos (${payments.length})`, margin, startY);
    startY += 2;

    const rows = payments.map((p, i) => [
      (i + 1).toString(),
      `${p.user.first_name} ${p.user.last_name || ""}`.trim(),
      PAYMENT_TYPE_LABELS[p.payment_type || ""] || "—",
      getDescription(p),
      formatCurrency(p.amount),
      formatCurrency(p.amount_paid || 0),
      formatCurrency(p.remaining_amount),
      formatDate(p.late_due),
      getDisplayStatus(p),
    ]);

    autoTable(doc, {
      startY,
      head: [
        [
          "#",
          "Usuario",
          "Tipo",
          "Descripción",
          "Monto",
          "Pagado",
          "Restante",
          "Vencimiento",
          "Estado",
        ],
      ],
      body: rows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
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
        2: { cellWidth: 20 },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 22, halign: "right" },
        7: { cellWidth: 24 },
        8: { cellWidth: 18, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 8) {
          const display = data.cell.raw as string;
          const key =
            display === "Pendiente"
              ? "vencido"
              : display === "En espera"
                ? "en espera"
                : display === "Pagado"
                  ? "completado"
                  : display === "Incompleto"
                    ? "incompleto"
                    : "";
          const bg = STATUS_COLORS[key];
          const fg = STATUS_TEXT_COLORS[key];
          if (bg) data.cell.styles.fillColor = bg;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      "No se encontraron pagos con los filtros seleccionados.",
      margin,
      startY,
    );
    startY += 10;
  }

  // --- Summary ---
  const tableStyles = {
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [55, 65, 81] as [number, number, number],
      lineColor: [229, 231, 235] as [number, number, number],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [55, 65, 81] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 7,
    },
  };

  const ensureSpace = (needed: number) => {
    if (pageHeight - startY - 15 < needed) {
      doc.addPage();
      startY = 18;
    }
  };

  if (payments.length > 0) {
    ensureSpace(40);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen", margin, startY);
    startY += 2;
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(margin, startY, margin + 30, startY);
    startY += 5;

    // Totals by payment type
    const byType: Record<
      string,
      { count: number; amount: number; paid: number; remaining: number }
    > = {};
    payments.forEach((p) => {
      const type = p.payment_type || "otro";
      if (!byType[type])
        byType[type] = { count: 0, amount: 0, paid: 0, remaining: 0 };
      byType[type].count++;
      byType[type].amount += p.amount || 0;
      byType[type].paid += p.amount_paid || 0;
      byType[type].remaining += p.remaining_amount || 0;
    });

    const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
    const totalRemaining = payments.reduce(
      (s, p) => s + (p.remaining_amount || 0),
      0,
    );

    const typeRows = Object.entries(byType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, data]) => [
        PAYMENT_TYPE_LABELS[type] || type,
        String(data.count),
        formatCurrency(data.amount),
        formatCurrency(data.paid),
        formatCurrency(data.remaining),
      ]);

    typeRows.push([
      "TOTAL",
      String(payments.length),
      formatCurrency(totalAmount),
      formatCurrency(totalPaid),
      formatCurrency(totalRemaining),
    ]);

    autoTable(doc, {
      startY,
      head: [["Tipo de pago", "Cant.", "Monto total", "Pagado", "Restante"]],
      body: typeRows,
      margin: { left: margin, right: pageWidth / 2 + 2 },
      ...tableStyles,
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center", cellWidth: 12 },
        2: { halign: "right", cellWidth: 24 },
        3: { halign: "right", cellWidth: 24 },
        4: { halign: "right", cellWidth: 24 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === typeRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 244, 246];
        }
      },
    });
    startY = (doc as any).lastAutoTable.finalY + 6;

    // Totals by status
    const byStatus: Record<
      string,
      { count: number; amount: number; remaining: number }
    > = {};
    payments.forEach((p) => {
      const key = getStatusKey(p);
      if (!byStatus[key]) byStatus[key] = { count: 0, amount: 0, remaining: 0 };
      byStatus[key].count++;
      byStatus[key].amount += p.amount || 0;
      byStatus[key].remaining += p.remaining_amount || 0;
    });

    const statusLabels: Record<string, string> = {
      "en espera": "En espera",
      completado: "Pagado",
      incompleto: "Incompleto",
      vencido: "Pendiente",
      cancelado: "Cancelado",
    };

    const statusRows = Object.entries(byStatus)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([st, data]) => [
        statusLabels[st] || st,
        String(data.count),
        formatCurrency(data.amount),
        formatCurrency(data.remaining),
      ]);

    ensureSpace(15);
    autoTable(doc, {
      startY,
      head: [["Estado", "Cant.", "Monto total", "Restante"]],
      body: statusRows,
      margin: { left: margin, right: pageWidth / 2 + 2 },
      ...tableStyles,
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center", cellWidth: 12 },
        2: { halign: "right", cellWidth: 24 },
        3: { halign: "right", cellWidth: 24 },
      },
    });
    startY = (doc as any).lastAutoTable.finalY + 6;

    // Mensualidades breakdown (enrollment type detail)
    const mensualidades = payments.filter(
      (p) => p.payment_type === "enrollment",
    );
    if (mensualidades.length > 0) {
      const mensTotal = mensualidades.reduce((s, p) => s + (p.amount || 0), 0);
      const mensPaid = mensualidades.reduce(
        (s, p) => s + (p.amount_paid || 0),
        0,
      );
      const mensRemaining = mensualidades.reduce(
        (s, p) => s + (p.remaining_amount || 0),
        0,
      );

      const byCourse: Record<
        string,
        { count: number; amount: number; paid: number; remaining: number }
      > = {};
      mensualidades.forEach((p) => {
        const name = p.course_enrollment_info?.course_name || "Sin curso";
        if (!byCourse[name])
          byCourse[name] = { count: 0, amount: 0, paid: 0, remaining: 0 };
        byCourse[name].count++;
        byCourse[name].amount += p.amount || 0;
        byCourse[name].paid += p.amount_paid || 0;
        byCourse[name].remaining += p.remaining_amount || 0;
      });

      const courseRows = Object.entries(byCourse)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => [
          name,
          String(data.count),
          formatCurrency(data.amount),
          formatCurrency(data.paid),
          formatCurrency(data.remaining),
        ]);

      courseRows.push([
        "TOTAL MENSUALIDADES",
        String(mensualidades.length),
        formatCurrency(mensTotal),
        formatCurrency(mensPaid),
        formatCurrency(mensRemaining),
      ]);

      ensureSpace(15);
      autoTable(doc, {
        startY,
        head: [
          [
            "Mensualidades por matrícula/curso",
            "Cant.",
            "Monto",
            "Pagado",
            "Restante",
          ],
        ],
        body: courseRows,
        margin: { left: margin, right: margin },
        ...tableStyles,
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "center", cellWidth: 12 },
          2: { halign: "right", cellWidth: 24 },
          3: { halign: "right", cellWidth: 24 },
          4: { halign: "right", cellWidth: 24 },
        },
        didParseCell: (data) => {
          if (
            data.section === "body" &&
            data.row.index === courseRows.length - 1
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [243, 244, 246];
          }
        },
      });
    }
  }

  drawFooter();
  doc.save(`reporte_pagos_${now.toISOString().slice(0, 10)}.pdf`);
}
