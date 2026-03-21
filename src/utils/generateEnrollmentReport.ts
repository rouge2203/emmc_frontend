import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CourseEnrollment {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
    career_name: string | null;
    is_matricula: boolean;
  };
  course_name: string;
  course_code: string;
  course_career_name: string | null;
  student_full_name: string;
  professor_full_name: string | null;
  period: number;
  period_display: string;
  year: number;
  status: string;
}

interface FilterLabels {
  year: string;
  period: string;
  status: string;
  career: string;
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  cursando: [219, 234, 254],
  aprobado: [220, 252, 231],
  reprobado: [254, 226, 226],
};

const STATUS_TEXT_COLORS: Record<string, [number, number, number]> = {
  cursando: [30, 64, 175],
  aprobado: [22, 101, 52],
  reprobado: [153, 27, 27],
};

function getPeriodLabel(period: number): string {
  return { 1: "I", 2: "II", 3: "III" }[period] || String(period);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateEnrollmentReport(
  enrollments: CourseEnrollment[],
  filters: FilterLabels,
  userName: string,
): Promise<void> {
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

  const matriculas = enrollments.filter((e) =>
    e.course_code.startsWith("MAT_"),
  );
  const courses = enrollments.filter((e) => !e.course_code.startsWith("MAT_"));

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/lobsterlogo.png");
  } catch {
    // Logo won't render if it can't be loaded
  }

  // --- Header ---
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

    // Filters as styled pills
    const filtersY = 37;
    const labels = [
      { key: "Año", value: filters.year },
      { key: "Período", value: filters.period },
      { key: "Estado", value: filters.status },
      { key: "Carrera", value: filters.career },
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

  // --- Footer on each page ---
  const drawFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Logo centered in footer
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
      doc.text(
        "Válido a la fecha de impresión.",
        margin,
        pageHeight - 5,
      );
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

  // --- Section 1: Matrículas ---
  if (matriculas.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`Matrículas (${matriculas.length})`, margin, startY);
    startY += 2;

    const matriculaRows = matriculas.map((e, i) => [
      (i + 1).toString(),
      e.student_full_name,
      e.course_name,
      e.course_career_name || "—",
      e.status,
      `${getPeriodLabel(e.period)} - ${e.year}`,
    ]);

    autoTable(doc, {
      startY,
      head: [["#", "Estudiante", "Matrícula", "Carrera", "Estado", "Período - Año"]],
      body: matriculaRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [55, 65, 81],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 26, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const status = data.cell.raw as string;
          const bg = STATUS_COLORS[status];
          const fg = STATUS_TEXT_COLORS[status];
          if (bg) data.cell.styles.fillColor = bg;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Section 2: Cursos ---
  if (courses.length > 0) {
    const remaining = pageHeight - startY - 20;
    if (remaining < 30) {
      doc.addPage();
      startY = 18;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`Cursos (${courses.length})`, margin, startY);
    startY += 2;

    const courseRows = courses.map((e, i) => [
      (i + 1).toString(),
      e.student_full_name,
      e.course_name,
      e.course_code,
      e.professor_full_name || "Sin asignar",
      e.status,
      `${getPeriodLabel(e.period)} - ${e.year}`,
    ]);

    autoTable(doc, {
      startY,
      head: [
        ["#", "Estudiante", "Curso", "Código", "Profesor/a", "Estado", "Período - Año"],
      ],
      body: courseRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [55, 65, 81],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 26, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const status = data.cell.raw as string;
          const bg = STATUS_COLORS[status];
          const fg = STATUS_TEXT_COLORS[status];
          if (bg) data.cell.styles.fillColor = bg;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Summary Section (sequential vertical layout) ---
  const tableStyles = {
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [55, 65, 81] as [number, number, number], lineColor: [229, 231, 235] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: [55, 65, 81] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const, fontSize: 7 },
  };

  const ensureSpace = (needed: number) => {
    if (pageHeight - startY - 15 < needed) {
      doc.addPage();
      startY = 18;
    }
  };

  const addSummary = () => {
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

    // --- Totals + Status (single compact table, half-width) ---
    const statusCounts: Record<string, number> = {};
    enrollments.forEach((e) => {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    });

    const totalsBody = [
      ["Total matrículas", String(matriculas.length)],
      ["Total cursos", String(courses.length)],
      ["Total general", String(enrollments.length)],
      ...Object.entries(statusCounts).map(([st, count]) => [
        st.charAt(0).toUpperCase() + st.slice(1),
        String(count),
      ]),
    ];

    autoTable(doc, {
      startY,
      head: [["Totales", "Cantidad"]],
      body: totalsBody,
      margin: { left: margin, right: pageWidth / 2 + 2 },
      ...tableStyles,
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center", cellWidth: 20 } },
    });
    startY = (doc as any).lastAutoTable.finalY + 6;

    // --- Matrículas por carrera (full-width) ---
    const matriculasByCareer: Record<string, number> = {};
    matriculas.forEach((e) => {
      const career = e.course_career_name || "Sin carrera";
      matriculasByCareer[career] = (matriculasByCareer[career] || 0) + 1;
    });

    if (Object.keys(matriculasByCareer).length > 0) {
      ensureSpace(15);
      autoTable(doc, {
        startY,
        head: [["Matrículas por carrera", "Cant."]],
        body: Object.entries(matriculasByCareer).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: 20 } },
      });
      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- Cursos por carrera (full-width) ---
    const coursesByCareer: Record<string, number> = {};
    courses.forEach((e) => {
      const career = e.course_career_name || "Sin carrera";
      coursesByCareer[career] = (coursesByCareer[career] || 0) + 1;
    });

    if (Object.keys(coursesByCareer).length > 0) {
      ensureSpace(15);
      autoTable(doc, {
        startY,
        head: [["Cursos por carrera", "Cant."]],
        body: Object.entries(coursesByCareer).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: 20 } },
      });
      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- Estudiantes por curso (full-width) ---
    const coursesByCourse: Record<string, number> = {};
    courses.forEach((e) => {
      coursesByCourse[e.course_name] = (coursesByCourse[e.course_name] || 0) + 1;
    });

    if (Object.keys(coursesByCourse).length > 0) {
      ensureSpace(15);
      autoTable(doc, {
        startY,
        head: [["Estudiantes por curso", "Cant."]],
        body: Object.entries(coursesByCourse).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: 20 } },
      });
      startY = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- Profesores y cursos impartidos (full-width) ---
    const professorCourses: Record<string, Set<string>> = {};
    courses.forEach((e) => {
      if (e.professor_full_name) {
        if (!professorCourses[e.professor_full_name]) {
          professorCourses[e.professor_full_name] = new Set();
        }
        professorCourses[e.professor_full_name].add(e.course_name);
      }
    });

    if (Object.keys(professorCourses).length > 0) {
      ensureSpace(15);
      const profData = Object.entries(professorCourses)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([prof, coursesSet]) => [prof, Array.from(coursesSet).join(", ")]);

      autoTable(doc, {
        startY,
        head: [["Profesor/a", "Cursos impartidos"]],
        body: profData,
        margin: { left: margin, right: margin },
        ...tableStyles,
        columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      });
    }
  };

  addSummary();
  drawFooter();

  doc.save(`reporte_matriculas_${now.toISOString().slice(0, 10)}.pdf`);
}
