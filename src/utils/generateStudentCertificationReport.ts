import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CertificationEnrollmentRow {
  course_code: string | null;
  course_name: string | null;
  course_career_name: string | null;
  grade: number | null;
  period: number;
  period_display: string;
  year: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  cursando: [219, 234, 254],
  aprobado: [220, 252, 231],
  reprobado: [254, 226, 226],
  retirado: [243, 244, 246],
};

const STATUS_TEXT_COLORS: Record<string, [number, number, number]> = {
  cursando: [30, 64, 175],
  aprobado: [22, 101, 52],
  reprobado: [153, 27, 27],
  retirado: [107, 114, 128],
};

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  retirado: "Retirado",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const part = iso.split("T")[0].split(" ")[0];
    const [y, m, d] = part.split("-").map(Number);
    if (!y || !m || !d) return "—";
    return new Date(y, m - 1, d).toLocaleDateString("es-CR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatNota(grade: number | null, status: string): string {
  if (grade != null && grade !== undefined) return String(grade);
  if (status === "cursando") return "En curso";
  return "—";
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function sortEnrollments(
  list: CertificationEnrollmentRow[],
): CertificationEnrollmentRow[] {
  return [...list].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.period !== a.period) return b.period - a.period;
    return (a.course_code || "").localeCompare(b.course_code || "");
  });
}

function safeFilenamePart(s: string, max = 40): string {
  return (
    s
      .replace(/[^\w\-.\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, max) || "estudiante"
  );
}

const GRADING_SCALE_NOTE =
  "Las calificaciones se ajustan a la escala de 1 a 100. La nota mínima de aprobación de cualquier materia es de 70.";

/** Circular school stamp (vector), matching institutional blue. */
function drawOfficialStamp(doc: jsPDF, cx: number, cy: number, r: number) {
  const blue: [number, number, number] = [30, 93, 149];
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.35);
  doc.circle(cx, cy, r, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  const lines = ["ESCUELA", "MUNICIPAL", "DE MÚSICA", "DE CARTAGO"];
  const fs = 4.6;
  doc.setFontSize(fs);
  const lineStep = 3.35;
  let ty = cy - ((lines.length - 1) * lineStep) / 2 + 0.5;
  for (const line of lines) {
    doc.text(line, cx, ty, { align: "center" });
    ty += lineStep;
  }
}

function drawDoubleRule(doc: jsPDF, x: number, y: number, w: number) {
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);
  doc.line(x, y + 0.55, x + w, y + 0.55);
}

/**
 * Signature line, director name, official stamp, and grading-scale disclaimer.
 * Returns Y after the closing double rule.
 */
function drawCertificationClosingSection(
  doc: jsPDF,
  margin: number,
  contentW: number,
  startY: number,
): number {
  const sigLineW = 54;
  const stampR = 13.5;
  const stampD = stampR * 2;
  const gapSigStamp = 7;
  const rowW = sigLineW + gapSigStamp + stampD;
  const rowLeft = margin + (contentW - rowW) / 2;

  let y = startY;
  const lineY = y;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.25);
  doc.line(rowLeft, lineY, rowLeft + sigLineW, lineY);

  y = lineY + 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 24, 39);
  doc.text("M.M. Federico Molina Campos", rowLeft + sigLineW / 2, y, {
    align: "center",
  });
  y += 4.5;
  doc.setFontSize(8.5);
  doc.text("Director", rowLeft + sigLineW / 2, y, { align: "center" });

  const stampCx = rowLeft + sigLineW + gapSigStamp + stampR;
  const stampCy = lineY + stampR - 0.5;
  drawOfficialStamp(doc, stampCx, stampCy, stampR);

  y = Math.max(y + 2, stampCy + stampR + 4);
  y += 6;

  drawDoubleRule(doc, margin, y, contentW);
  y += 3.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const noteLines = doc.splitTextToSize(GRADING_SCALE_NOTE, contentW - 4);
  doc.text(noteLines, margin + 2, y);
  y += noteLines.length * 3.8 + 2.5;
  drawDoubleRule(doc, margin, y, contentW);
  return y + 2;
}

/** Draws logo (optional) + student info box. Returns the Y position after the block. */
function drawStudentInfoBox(
  doc: jsPDF,
  margin: number,
  contentW: number,
  logoImg: HTMLImageElement | null,
  logoW: number,
  carnet: string,
  studentName: string,
  catedraLine: string,
  startY: number,
  /** If true and there is no logo, add a small top gap (continuation pages with no image asset). */
  spacerIfNoLogo = true,
): number {
  let y = startY;
  if (logoImg) {
    const logoH = (logoImg.height / logoImg.width) * logoW;
    try {
      doc.addImage(logoImg, "PNG", margin, y, logoW, logoH);
    } catch {
      // ignore
    }
    y += logoH + 4;
  } else if (spacerIfNoLogo) {
    y += 6;
  }
  const boxH = 26;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, boxH);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 114, 128);
  doc.text("Carné", margin + 3, y + 5);
  doc.text("Nombre completo", margin + 3, y + 13);
  doc.text("Cátedra / carrera", margin + 3, y + 21);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 24, 39);
  doc.text(carnet || "—", margin + 28, y + 5);
  const nameLine = studentName || "—";
  const nameSplit = doc.splitTextToSize(nameLine, contentW - 36);
  doc.text(nameSplit[0] || "—", margin + 28, y + 13);
  if (nameSplit[1]) doc.text(nameSplit[1], margin + 28, y + 17);
  const catSplit = doc.splitTextToSize(catedraLine || "—", contentW - 36);
  doc.text(catSplit[0] || "—", margin + 28, y + 21);
  y += boxH;
  return y;
}

export interface GenerateStudentCertificationParams {
  enrollments: CertificationEnrollmentRow[];
  carnet: string;
  studentName: string;
  catedraLine: string;
  printedBy: string;
}

export async function generateStudentCertificationReport({
  enrollments,
  carnet,
  studentName,
  catedraLine,
  printedBy,
}: GenerateStudentCertificationParams): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageWidth - margin * 2;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const issuer = (printedBy || "—").trim() || "—";
  const rightFooterText = `Documento generado por: ${issuer}`;

  const logoW = 42;
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/emmc_logo.png");
  } catch {
    // optional
  }

  const logoHDrawn = logoImg ? (logoImg.height / logoImg.width) * logoW : 0;
  const gapAfterLogo = logoImg ? 4 : 6;
  const studentBoxH = 26;
  const gapBeforeTable = 4;
  const continuationTableStartY =
    margin +
    (logoHDrawn > 0 ? logoHDrawn + gapAfterLogo : gapAfterLogo) +
    studentBoxH +
    gapBeforeTable;

  let y = margin;
  if (logoImg) {
    const h = (logoImg.height / logoImg.width) * logoW;
    try {
      doc.addImage(logoImg, "PNG", margin, y, logoW, h);
    } catch {
      // ignore
    }
    y += h + 4;
  } else {
    y += 6;
  }

  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 93, 149);
  const titleLines = doc.splitTextToSize(
    "La Escuela Municipal de Música de Cartago certifica el siguiente informe de cursos:",
    contentW,
  );
  doc.text(titleLines, margin, y);
  y += titleLines.length * 5 + 3;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const subLines = doc.splitTextToSize(
    "El presente documento constituye un registro de la trayectoria académica del o la estudiante en los cursos detallados a continuación.",
    contentW,
  );
  doc.text(subLines, margin, y);
  y += subLines.length * 4.5 + 4;

  y = drawStudentInfoBox(
    doc,
    margin,
    contentW,
    null,
    logoW,
    carnet,
    studentName,
    catedraLine,
    y,
    false,
  );
  y += 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Cursos registrados", margin, y);
  y += 2;

  const sorted = sortEnrollments(enrollments);
  const tableBody: string[][] =
    sorted.length === 0
      ? [["—", "No hay cursos registrados", "—", "—", "—", "—"]]
      : sorted.map((e) => {
          const fe = e.updated_at || e.created_at;
          return [
            e.course_code || "—",
            e.course_name || "—",
            formatNota(e.grade, e.status),
            `${e.period_display || "?"} - ${e.year}`,
            formatDateEs(fe),
            getStatusLabel(e.status),
          ];
        });

  /** Space left blank at bottom so the single-line footer does not touch the table. */
  const pageFooterReservedMm = 6.5;

  autoTable(doc, {
    startY: y,
    showHead: "everyPage",
    head: [
      [
        "Código",
        "Curso",
        "Nota",
        "Semestre",
        "Fecha",
        "Estado",
      ],
    ],
    body: tableBody,
    margin: {
      left: margin,
      right: margin,
      top: continuationTableStartY,
      bottom: pageFooterReservedMm,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
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
      0: { cellWidth: 22 },
      1: { cellWidth: 52 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22, halign: "center" },
    },
    willDrawPage: (data) => {
      if (data.pageNumber <= 1) return;
      const d = data.doc;
      d.setPage(data.pageNumber);
      drawStudentInfoBox(
        d,
        margin,
        contentW,
        logoImg,
        logoW,
        carnet,
        studentName,
        catedraLine,
        margin,
      );
    },
    didParseCell: (data) => {
      if (data.section === "body" && sorted.length > 0) {
        const row = sorted[data.row.index];
        if (row) {
          const bg = STATUS_COLORS[row.status];
          const fg = STATUS_TEXT_COLORS[row.status];
          if (data.column.index === 5 && bg) {
            data.cell.styles.fillColor = bg;
            if (fg) data.cell.styles.textColor = fg;
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
  });

  let totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  let closingStartY = (lastTable?.finalY ?? y) + 10;
  const footerReserveMm = 14;
  const closingBlockEstimateMm = 62;
  if (closingStartY + closingBlockEstimateMm > pageHeight - footerReserveMm) {
    doc.addPage();
    totalPages = doc.getNumberOfPages();
    doc.setPage(totalPages);
    closingStartY = margin + 18;
  }
  drawCertificationClosingSection(doc, margin, contentW, closingStartY);
  totalPages = doc.getNumberOfPages();

  const footerFromBottomMm = 2.5;
  const footerBaseY = pageHeight - footerFromBottomMm;
  const footerFont = 7;
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFontSize(footerFont);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    const leftText = `Fecha de emisión: ${dateStr}`;
    doc.text(leftText, margin, footerBaseY);
    doc.setTextColor(55, 65, 99);
    doc.text(rightFooterText, pageWidth - margin, footerBaseY, {
      align: "right",
    });
  }

  const fname = safeFilenamePart(
    `${carnet}_${studentName}`.replace(/\s/g, "_"),
  );
  doc.save(`Certificacion_cursos_${fname}.pdf`);
}
