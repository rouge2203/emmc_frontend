// jspdf is heavy (~350 kB gzipped with autotable); load it only when a
// report is actually generated instead of shipping it in the page bundle.
type JsPDFModule = typeof import("jspdf");
type AutoTableModule = typeof import("jspdf-autotable");
let jsPDF: JsPDFModule["default"];
let autoTable: AutoTableModule["default"];
// jspdf exports GState as a real class, so the footer watermark can set its
// opacity without casting the doc to any the way the older reports do.
let GState: JsPDFModule["GState"];

async function ensurePdfLibs(): Promise<void> {
  if (!jsPDF) {
    const [jspdfMod, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    jsPDF = jspdfMod.default;
    autoTable = autoTableMod.default;
    GState = jspdfMod.GState;
  }
}

export interface AgeReportBucket {
  age: number;
  label: string;
  count: number;
}

export interface AgeReportSpan {
  from: number;
  to: number;
  count: number;
  percentage: number;
  label: string;
}

export interface AgeReportStudent {
  name: string;
  age: number;
  career: string;
  courses: number;
}

export interface AgeReportData {
  reference_date: string;
  summary: {
    total: number;
    unknown_count: number;
    median: number | null;
    average: number | null;
    dominant_span: AgeReportSpan | null;
  };
  buckets: AgeReportBucket[];
  students: AgeReportStudent[];
}

export interface AgeReportFilterLabels {
  year: string;
  period: string;
  ageRange: string;
}

/** Brand hue, matching the on-screen chart's in-span bars (#155c95). */
const BRAND: [number, number, number] = [21, 92, 149];
/** Out-of-span bars, matching the chart's #d1d5db. */
const BAR_MUTED: [number, number, number] = [209, 213, 219];
/** A zero-count year still gets a hairline so the axis stays continuous. */
const BAR_EMPTY: [number, number, number] = [235, 237, 240];

const formatNumber = (value: number): string => value.toLocaleString("es-CR");

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateAgeDistributionReport(
  data: AgeReportData,
  filters: AgeReportFilterLabels,
  userName: string,
  /** The requested age window, used to decide what the chart highlights. */
  ageFilter: { min: number | null; max: number | null } = {
    min: null,
    max: null,
  },
): Promise<void> {
  await ensurePdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
      { key: "Edad", value: filters.ageRange },
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
        doc.setGState(new GState({ opacity: 0.35 }));
        doc.addImage(logoImg, "PNG", logoX, pageHeight - 9, logoW, logoH);
        doc.setGState(new GState({ opacity: 1 }));
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

  const { summary, buckets, students } = data;
  let startY = 50;

  // --- Headline: the question the chart exists to answer ---
  const span = summary.dominant_span;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Distribución de edades", margin, startY);

  startY += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  if (span) {
    doc.setFont("helvetica", "bold");
    doc.text(`Mayor presencia: ${span.label}`, margin, startY);
    const spanWidth = doc.getTextWidth(`Mayor presencia: ${span.label}`);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      `  ·  ${formatNumber(span.count)} estudiantes  ·  ${span.percentage
        .toFixed(1)
        .replace(".", ",")}% del total`,
      margin + spanWidth,
      startY,
    );
  }

  // On its own line rather than right-aligned on the headline's: at this page
  // width the two strings collide, and the overlap is silent.
  startY += 4;
  const stats: string[] = [];
  if (summary.median !== null) stats.push(`Mediana ${summary.median} años`);
  if (summary.average !== null) {
    stats.push(`Promedio ${summary.average.toFixed(1).replace(".", ",")}`);
  }
  stats.push(
    `${formatNumber(summary.total)} estudiantes con fecha de nacimiento`,
  );
  if (summary.unknown_count > 0) {
    stats.push(
      `${formatNumber(summary.unknown_count)} sin fecha (excluidos de los porcentajes)`,
    );
  }
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(stats.join("  ·  "), margin, startY);

  startY += 6;

  // --- The chart, redrawn as vector rects ---
  // The bars cover EVERY age on record, not just the filtered slice, so a
  // narrow age filter still shows where that slice sits in the whole school.
  // The highlight follows the filter when there is one, and the dominant span
  // otherwise — the highlighted band is always what the reader asked about.
  if (buckets.length > 0) {
    const chartX = margin;
    const chartW = pageWidth - margin * 2;
    const chartH = 34;
    const baseline = startY + chartH;
    const colW = chartW / buckets.length;
    const barW = Math.max(0.5, colW - 0.35);
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));

    const hasAgeFilter = ageFilter.min !== null || ageFilter.max !== null;
    const firstAge = buckets[0].age;
    const lastAge = buckets[buckets.length - 1].age;
    const highlightFrom = hasAgeFilter
      ? (ageFilter.min ?? firstAge)
      : span
        ? span.from
        : null;
    const highlightTo = hasAgeFilter
      ? (ageFilter.max ?? lastAge)
      : span
        ? span.to
        : null;
    const highlightCaption = hasAgeFilter
      ? "rango seleccionado"
      : "mayor presencia";

    buckets.forEach((bucket, index) => {
      const x = chartX + index * colW + (colW - barW) / 2;
      const inHighlight =
        highlightFrom !== null &&
        highlightTo !== null &&
        bucket.age >= highlightFrom &&
        bucket.age <= highlightTo;

      if (bucket.count === 0) {
        doc.setFillColor(...BAR_EMPTY);
        doc.rect(x, baseline - 0.3, barW, 0.3, "F");
        return;
      }
      const h = Math.max(0.4, (bucket.count / maxCount) * chartH);
      doc.setFillColor(...(inHighlight ? BRAND : BAR_MUTED));
      doc.rect(x, baseline - h, barW, h, "F");
    });

    // Baseline
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(chartX, baseline, chartX + chartW, baseline);

    // Peak reference, so the bar heights are readable as counts
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(`máx. ${formatNumber(maxCount)}`, chartX, startY - 0.5);

    // X axis: label roughly every 8 mm, always including both ends and the
    // highlighted band's edges.
    const step = Math.max(1, Math.ceil(8 / colW));
    const forced = new Set<number>([0, buckets.length - 1]);
    buckets.forEach((bucket, index) => {
      if (bucket.age === highlightFrom || bucket.age === highlightTo) {
        forced.add(index);
      }
    });
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 128);
    buckets.forEach((bucket, index) => {
      const isForced = forced.has(index);
      if (!isForced && index % step !== 0) return;
      // Don't let a stepped label crowd one of the forced ones.
      if (!isForced) {
        let tooClose = false;
        forced.forEach((f) => {
          if (Math.abs(f - index) < step) tooClose = true;
        });
        if (tooClose) return;
      }
      doc.text(bucket.label, chartX + index * colW + colW / 2, baseline + 3, {
        align: "center",
      });
    });

    // Bracket under the highlighted band. The bounds are clamped onto real
    // buckets rather than matched exactly, so a filter like 30-40 still brackets
    // correctly when no student is precisely 30 or 40.
    if (highlightFrom !== null && highlightTo !== null) {
      const fromIndex = buckets.findIndex((b) => b.age >= highlightFrom);
      let toIndex = -1;
      for (let i = buckets.length - 1; i >= 0; i -= 1) {
        if (buckets[i].age <= highlightTo) {
          toIndex = i;
          break;
        }
      }
      if (fromIndex >= 0 && toIndex >= fromIndex) {
        const x1 = chartX + fromIndex * colW;
        const x2 = chartX + (toIndex + 1) * colW;
        const y = baseline + 5;
        doc.setDrawColor(...BRAND);
        doc.setLineWidth(0.4);
        doc.line(x1, y, x2, y);
        doc.line(x1, y, x1, y - 1.2);
        doc.line(x2, y, x2, y - 1.2);
        doc.setFontSize(6);
        doc.setTextColor(...BRAND);
        doc.text(highlightCaption, (x1 + x2) / 2, y + 3, { align: "center" });
      }
    }

    // Clears the axis labels and, when present, the bracket caption below them.
    startY = baseline + (highlightFrom !== null ? 16 : 10);
  }

  // --- Student roster ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(`Estudiantes (${formatNumber(students.length)})`, margin, startY);
  startY += 2;

  if (students.length > 0) {
    const rows = students.map((student, index) => [
      (index + 1).toString(),
      student.name,
      student.age.toString(),
      student.career,
      formatNumber(student.courses),
    ]);

    autoTable(doc, {
      startY,
      head: [["#", "Estudiante", "Edad", "Carrera", "Cursos"]],
      body: rows,
      margin: { left: margin, right: margin, top: 16 },
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
        0: { cellWidth: 10, halign: "center" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 52 },
        4: { cellWidth: 18, halign: "center" },
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      "No se encontraron estudiantes con los filtros seleccionados.",
      margin,
      startY + 6,
    );
  }

  drawFooter();
  doc.save(`reporte_edades_${now.toISOString().slice(0, 10)}.pdf`);
}
