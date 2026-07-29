import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EnrollmentSchedule {
  day_display: string | null;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
  classroom_name: string | null;
}

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
  assigned_course?: {
    id: number;
    code: string;
    name: string;
    career_name: string | null;
  } | null;
  student?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
  } | null;
  student_full_name: string;
  student_carnet?: string | null;
  student_phone?: string | null;
  professor_full_name: string | null;
  period: number;
  period_display: string;
  year: number;
  status: string;
  grade?: number | null;
  schedules?: EnrollmentSchedule[] | null;
}

interface FilterLabels {
  year: string;
  period: string;
  status: string;
  career: string;
}

interface ProfessorFilterLabels extends FilterLabels {
  professor: string;
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

/**
 * Clamps the caller-supplied scale so a bad value can never produce a blank or
 * unreadable PDF. Anything non-finite falls back to the unscaled report.
 */
function normalizeScale(fontScale: number): number {
  return Number.isFinite(fontScale) && fontScale > 0
    ? Math.min(Math.max(fontScale, 1), 1.3)
    : 1;
}

// --- Career grouping -------------------------------------------------------
// A student has no direct career relation in the data model: a career reaches an
// enrollment through Course.career, and in practice only the MAT_ matrícula
// courses carry one. So a student's career(s) are the careers of their matrícula
// rows, and a student is "multi-career" when those rows span more than one.

const CAREER_NONE = "Sin carrera";
const CAREER_MULTI = "Estudiantes con varias carreras";

function rowCareer(e: CourseEnrollment): string | null {
  return (
    e.course_career_name ||
    e.assigned_course?.career_name ||
    e.course?.career_name ||
    null
  );
}

/**
 * Maps student id -> the set of careers seen for them. Built once over the whole
 * payload, before the matrícula/curso split, so a student whose matrícula is in
 * one section and whose courses are in the other is still classified once.
 */
function buildStudentCareers(
  enrollments: CourseEnrollment[],
): Map<number, Set<string>> {
  const byStudent = new Map<number, Set<string>>();
  enrollments.forEach((e) => {
    const id = e.student?.id;
    if (id == null) return;
    let set = byStudent.get(id);
    if (!set) {
      set = new Set<string>();
      byStudent.set(id, set);
    }
    const career = rowCareer(e);
    // Rows with no career are missing information, not a second career, so they
    // must not push a student into the multi-career bucket.
    if (career) set.add(career);
  });
  return byStudent;
}

function studentGroupKey(
  e: CourseEnrollment,
  careers: Map<number, Set<string>>,
): string {
  const id = e.student?.id;
  const set = id == null ? undefined : careers.get(id);
  if (!set || set.size === 0) return CAREER_NONE;
  if (set.size > 1) return CAREER_MULTI;
  return set.values().next().value as string;
}

interface CareerGroup {
  key: string;
  rows: CourseEnrollment[];
}

function groupByCareer(
  rows: CourseEnrollment[],
  careers: Map<number, Set<string>>,
  collator: Intl.Collator,
): CareerGroup[] {
  const map = new Map<string, CourseEnrollment[]>();
  rows.forEach((e) => {
    const key = studentGroupKey(e, careers);
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  });

  // Named careers first (alphabetical), then "Sin carrera", then the
  // multi-career group last.
  const rank = (k: string) => (k === CAREER_MULTI ? 2 : k === CAREER_NONE ? 1 : 0);

  return Array.from(map.entries())
    .map(([key, groupRows]) => ({
      key,
      rows: groupRows.sort(
        (a, b) =>
          collator.compare(a.student_full_name || "", b.student_full_name || "") ||
          collator.compare(a.course_name || "", b.course_name || "") ||
          collator.compare(a.course_code || "", b.course_code || "") ||
          a.id - b.id,
      ),
    }))
    .sort((a, b) => rank(a.key) - rank(b.key) || collator.compare(a.key, b.key));
}

export async function generateEnrollmentReport(
  enrollments: CourseEnrollment[],
  filters: FilterLabels,
  userName: string,
  fontScale: number = 1,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const scale = normalizeScale(fontScale);
  // fs() scales type sizes, sp() scales millimetre spacing. At scale 1 both are
  // identities, so the default report is byte-for-byte what it was before.
  const fs = (n: number) => Number((n * scale).toFixed(2));
  const sp = (n: number) => Number((n * scale).toFixed(2));
  const collator = new Intl.Collator("es", { sensitivity: "base" });
  const contentWidth = pageWidth - margin * 2;

  // jspdf-autotable augments the doc at runtime; read the cursor through one
  // narrow accessor instead of casting at every call site.
  const lastTableY = (): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;


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

  const studentCareers = buildStudentCareers(enrollments);

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/lobsterlogo.png");
  } catch {
    // Logo won't render if it can't be loaded
  }

  // --- Header ---
  // Laid out with a running cursor rather than absolute millimetre constants, so
  // larger type pushes the whole block down instead of colliding with it.
  const drawHeader = (): number => {
    let y = sp(18);

    doc.setFontSize(fs(16));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Escuela Municipal de Música de Cartago", margin, y);

    y += sp(4);
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + sp(80), y);

    y += sp(5);
    doc.setFontSize(fs(8));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha: ${dateStr}`, margin, y);
    y += sp(4);
    doc.text(`Impreso por: ${userName}`, margin, y);

    y += sp(6);
    const labels = [
      { key: "Año", value: filters.year },
      { key: "Período", value: filters.period },
      { key: "Estado", value: filters.status },
      { key: "Carrera", value: filters.career },
    ];

    doc.setFontSize(fs(7));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("FILTROS APLICADOS", margin, y);

    let xPos = margin;
    let pillY = y + sp(2);
    const pillHeight = sp(5);

    labels.forEach((f) => {
      const text = `${f.key}: ${f.value}`;
      doc.setFontSize(fs(7));
      doc.setFont("helvetica", "normal");
      const pillWidth = doc.getTextWidth(text) + sp(5);

      // Wrap onto a new row instead of running off the page at larger sizes.
      if (xPos > margin && xPos + pillWidth > pageWidth - margin) {
        xPos = margin;
        pillY += pillHeight + sp(2);
      }

      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(xPos, pillY, pillWidth, pillHeight, 1, 1, "FD");

      doc.setTextColor(55, 65, 81);
      doc.text(text, xPos + sp(2.5), pillY + pillHeight * 0.7);

      xPos += pillWidth + sp(3);
    });

    return pillY + pillHeight + sp(4);
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

      doc.setFontSize(fs(6.5));
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

  let startY = drawHeader();

  // Reserve enough room that a heading is never stranded at the foot of a page.
  const bottomSlack = sp(20);
  const ensureSpace = (needed: number) => {
    if (pageHeight - startY - bottomSlack < needed) {
      doc.addPage();
      startY = sp(18);
    }
  };

  // A career group is only worth starting if its heading, rule, table head and
  // a couple of body rows fit.
  const GROUP_RESERVE = 28;
  // A section title is always followed by the sp(2) advance inside
  // sectionTitle(), an sp(4) gap, and then the first career group. Reserving
  // only the title's own height would let it be drawn at the foot of a page
  // with its first group pushed to the next one.
  const SECTION_RESERVE = 30 + 2 + 4 + GROUP_RESERVE;

  const sectionTitle = (text: string) => {
    doc.setFontSize(fs(11));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(text, margin, startY);
    startY += sp(2);
  };

  const groupHeading = (text: string) => {
    doc.setFontSize(fs(9.5));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text(text, margin, startY);
    startY += sp(1.5);
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(margin, startY, margin + sp(34), startY);
    startY += sp(3.5);
  };

  const baseStyles = {
    fontSize: fs(7.5),
    cellPadding: sp(1.8),
    textColor: [55, 65, 81] as [number, number, number],
    lineColor: [229, 231, 235] as [number, number, number],
    lineWidth: 0.1,
    overflow: "linebreak" as const,
  };

  const baseHeadStyles = {
    fillColor: [31, 41, 55] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: fs(7.5),
  };

  /**
   * Renders one career group as its own table under its own heading. Column
   * indices are derived from the header row so adding or moving a column can
   * never silently mis-target the status tinting.
   */
  const renderGroupTable = (
    head: string[],
    rows: string[][],
    fixedWidths: Record<string, number>,
  ) => {
    const statusIdx = head.indexOf("Estado");
    const columnStyles: Record<number, any> = {};
    Object.entries(fixedWidths).forEach(([label, width]) => {
      const idx = head.indexOf(label);
      if (idx === -1) return;
      columnStyles[idx] = {
        cellWidth: sp(width),
        halign:
          label === "Estudiante" || label === "Carnet" || label === "Teléfono"
            ? "left"
            : "center",
      };
    });
    if (columnStyles[0]) columnStyles[0].halign = "center";

    autoTable(doc, {
      startY,
      head: [head],
      body: rows,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      styles: baseStyles,
      headStyles: baseHeadStyles,
      columnStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === statusIdx) {
          const status = data.cell.raw as string;
          const bg = STATUS_COLORS[status];
          const fg = STATUS_TEXT_COLORS[status];
          if (bg) data.cell.styles.fillColor = bg;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    startY = lastTableY() + sp(6);
  };

  // --- Section 1: Matrículas (grouped by carrera) ---
  if (matriculas.length > 0) {
    ensureSpace(sp(SECTION_RESERVE));
    sectionTitle(`Matrículas (${matriculas.length})`);
    startY += sp(4);

    const head = [
      "#",
      "Estudiante",
      "Carnet",
      "Teléfono",
      "Matrícula",
      "Carrera",
      "Estado",
      "Período - Año",
    ];
    const fixed = {
      "#": 10,
      Carnet: 18,
      "Teléfono": 20,
      Estado: 20,
      "Período - Año": 26,
    };

    groupByCareer(matriculas, studentCareers, collator).forEach((group) => {
      ensureSpace(sp(GROUP_RESERVE));
      groupHeading(`${group.key} (${group.rows.length})`);
      const rows = group.rows.map((e, i) => [
        (i + 1).toString(),
        e.student_full_name,
        e.student_carnet || "—",
        e.student_phone || "—",
        e.course_name,
        e.course_career_name || "—",
        e.status,
        `${getPeriodLabel(e.period)} - ${e.year}`,
      ]);
      renderGroupTable(head, rows, fixed);
    });

    startY += sp(2);
  }

  // --- Section 2: Cursos (grouped by the student's carrera) ---
  if (courses.length > 0) {
    ensureSpace(sp(SECTION_RESERVE));
    sectionTitle(`Cursos (${courses.length})`);
    startY += sp(4);

    const head = [
      "#",
      "Estudiante",
      "Carnet",
      "Teléfono",
      "Curso",
      "Código",
      "Profesor/a",
      "Estado",
      "Período - Año",
    ];
    const fixed = {
      "#": 10,
      Carnet: 18,
      "Teléfono": 20,
      "Código": 22,
      Estado: 20,
      "Período - Año": 26,
    };

    groupByCareer(courses, studentCareers, collator).forEach((group) => {
      ensureSpace(sp(GROUP_RESERVE));
      groupHeading(`${group.key} (${group.rows.length})`);
      const rows = group.rows.map((e, i) => [
        (i + 1).toString(),
        e.student_full_name,
        e.student_carnet || "—",
        e.student_phone || "—",
        e.course_name,
        e.course_code,
        e.professor_full_name || "Sin asignar",
        e.status,
        `${getPeriodLabel(e.period)} - ${e.year}`,
      ]);
      renderGroupTable(head, rows, fixed);
    });

    startY += sp(2);
  }

  // --- Summary Section (sequential vertical layout) ---
  const tableStyles = {
    styles: {
      fontSize: fs(7),
      cellPadding: sp(1.5),
      textColor: [55, 65, 81] as [number, number, number],
      lineColor: [229, 231, 235] as [number, number, number],
      lineWidth: 0.1,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: [55, 65, 81] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: fs(7),
    },
  };

  const addSummary = () => {
    ensureSpace(sp(40));

    doc.setFontSize(fs(11));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen", margin, startY);
    startY += sp(2);
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(margin, startY, margin + sp(30), startY);
    startY += sp(5);

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
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center", cellWidth: sp(20) },
      },
    });
    startY = lastTableY() + sp(6);

    // --- Estudiantes por carrera (derived the same way as the groups above) ---
    const studentsByCareer: Record<string, number> = {};
    let multiCareerStudents = 0;
    studentCareers.forEach((set) => {
      if (set.size === 0) {
        studentsByCareer[CAREER_NONE] = (studentsByCareer[CAREER_NONE] || 0) + 1;
      } else if (set.size > 1) {
        multiCareerStudents += 1;
      } else {
        const name = set.values().next().value as string;
        studentsByCareer[name] = (studentsByCareer[name] || 0) + 1;
      }
    });

    if (Object.keys(studentsByCareer).length > 0 || multiCareerStudents > 0) {
      ensureSpace(sp(15));
      const body = Object.entries(studentsByCareer)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, String(v)]);
      if (multiCareerStudents > 0) {
        body.push([CAREER_MULTI, String(multiCareerStudents)]);
      }
      autoTable(doc, {
        startY,
        head: [["Estudiantes por carrera", "Cant."]],
        body,
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: sp(20) } },
      });
      startY = lastTableY() + sp(6);
    }

    // --- Matrículas por carrera (full-width) ---
    const matriculasByCareer: Record<string, number> = {};
    matriculas.forEach((e) => {
      const career = e.course_career_name || CAREER_NONE;
      matriculasByCareer[career] = (matriculasByCareer[career] || 0) + 1;
    });

    if (Object.keys(matriculasByCareer).length > 0) {
      ensureSpace(sp(15));
      autoTable(doc, {
        startY,
        head: [["Matrículas por carrera", "Cant."]],
        body: Object.entries(matriculasByCareer)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: sp(20) } },
      });
      startY = lastTableY() + sp(6);
    }

    // --- Cursos por carrera (full-width) ---
    const coursesByCareer: Record<string, number> = {};
    courses.forEach((e) => {
      const career = e.course_career_name || CAREER_NONE;
      coursesByCareer[career] = (coursesByCareer[career] || 0) + 1;
    });

    if (Object.keys(coursesByCareer).length > 0) {
      ensureSpace(sp(15));
      autoTable(doc, {
        startY,
        head: [["Cursos por carrera", "Cant."]],
        body: Object.entries(coursesByCareer)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: sp(20) } },
      });
      startY = lastTableY() + sp(6);
    }

    // --- Estudiantes por curso (full-width) ---
    const coursesByCourse: Record<string, number> = {};
    courses.forEach((e) => {
      coursesByCourse[e.course_name] = (coursesByCourse[e.course_name] || 0) + 1;
    });

    if (Object.keys(coursesByCourse).length > 0) {
      ensureSpace(sp(15));
      autoTable(doc, {
        startY,
        head: [["Estudiantes por curso", "Cant."]],
        body: Object.entries(coursesByCourse)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [k, String(v)]),
        margin: { left: margin, right: pageWidth / 2 + 2 },
        ...tableStyles,
        columnStyles: { 1: { halign: "center", cellWidth: sp(20) } },
      });
      startY = lastTableY() + sp(6);
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
      ensureSpace(sp(15));
      const profData = Object.entries(professorCourses)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([prof, coursesSet]) => [prof, Array.from(coursesSet).join(", ")]);

      autoTable(doc, {
        startY,
        head: [["Profesor/a", "Cursos impartidos"]],
        body: profData,
        margin: { left: margin, right: margin },
        ...tableStyles,
        columnStyles: { 0: { cellWidth: sp(50), fontStyle: "bold" } },
      });
    }
  };

  addSummary();
  drawFooter();

  doc.save(`reporte_matriculas_${now.toISOString().slice(0, 10)}.pdf`);
}

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  aprobado: "Aprobado",
  reprobado: "Reprobado",
  retirado: "Retirado",
};

function subjectLabel(e: CourseEnrollment): string {
  if (e.assigned_course?.name) return e.assigned_course.name;
  if (e.course?.is_matricula) return "Asignatura pendiente";
  return e.course_name;
}

function formatSchedules(schedules: EnrollmentSchedule[] | null | undefined): {
  aula: string;
  horario: string;
} {
  if (!schedules || schedules.length === 0) return { aula: "—", horario: "—" };
  const aulas = Array.from(
    new Set(
      schedules
        .map((s) => s.classroom || s.classroom_name)
        .filter((v): v is string => !!v),
    ),
  ).join(", ");
  const horario = schedules
    .map((s) => {
      const h = s.hour ? s.hour.slice(0, 5) : "";
      const end = s.end_hour ? s.end_hour.slice(0, 5) : "";
      const time = h && end ? `${h}-${end}` : h;
      return `${s.day_display || ""} ${time}`.trim();
    })
    .filter(Boolean)
    .join("\n");
  return { aula: aulas || "—", horario: horario || "—" };
}

export async function generateProfessorReport(
  enrollments: CourseEnrollment[],
  filters: ProfessorFilterLabels,
  userName: string,
  fontScale: number = 1,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const scale = normalizeScale(fontScale);
  const fs = (n: number) => Number((n * scale).toFixed(2));
  const sp = (n: number) => Number((n * scale).toFixed(2));
  const contentWidth = pageWidth - margin * 2;

  // jspdf-autotable augments the doc at runtime; read the cursor through one
  // narrow accessor instead of casting at every call site.
  const lastTableY = (): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;


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

  // --- Header ---
  const drawHeader = (): number => {
    let y = sp(18);

    doc.setFontSize(fs(16));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Escuela Municipal de Música de Cartago", margin, y);

    y += sp(4);
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + sp(80), y);

    y += sp(5);
    doc.setFontSize(fs(9));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Reporte por profesor", margin, y);

    y += sp(5);
    doc.setFontSize(fs(8));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha: ${dateStr}`, margin, y);
    y += sp(4);
    doc.text(`Impreso por: ${userName}`, margin, y);

    y += sp(6);
    const labels = [
      { key: "Profesor", value: filters.professor },
      { key: "Año", value: filters.year },
      { key: "Período", value: filters.period },
      { key: "Estado", value: filters.status },
      { key: "Carrera", value: filters.career },
    ];

    doc.setFontSize(fs(7));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("FILTROS APLICADOS", margin, y);

    let xPos = margin;
    let pillY = y + sp(2);
    const pillHeight = sp(5);

    labels.forEach((f) => {
      const text = `${f.key}: ${f.value}`;
      doc.setFontSize(fs(7));
      doc.setFont("helvetica", "normal");
      const pillWidth = doc.getTextWidth(text) + sp(5);

      if (xPos > margin && xPos + pillWidth > pageWidth - margin) {
        xPos = margin;
        pillY += pillHeight + sp(2);
      }

      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(xPos, pillY, pillWidth, pillHeight, 1, 1, "FD");

      doc.setTextColor(55, 65, 81);
      doc.text(text, xPos + sp(2.5), pillY + pillHeight * 0.7);

      xPos += pillWidth + sp(3);
    });

    return pillY + pillHeight + sp(11);
  };

  // --- Footer on each page ---
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
      doc.setFontSize(fs(6.5));
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

  let startY = drawHeader();

  // --- Group enrollments by professor ---
  const NO_PROF = "Sin profesor asignado";
  const groups = new Map<string, CourseEnrollment[]>();
  enrollments.forEach((e) => {
    const key = e.professor_full_name?.trim() || NO_PROF;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  });

  const sortedNames = Array.from(groups.keys()).sort((a, b) => {
    if (a === NO_PROF) return 1;
    if (b === NO_PROF) return -1;
    return a.localeCompare(b, "es");
  });

  if (enrollments.length === 0) {
    doc.setFontSize(fs(10));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(
      "No se encontraron matrículas para los filtros seleccionados.",
      margin,
      startY,
    );
  }

  sortedNames.forEach((name) => {
    const group = groups.get(name)!;

    // Keep the heading with at least a couple of rows on the same page
    if (pageHeight - startY - sp(20) < sp(24)) {
      doc.addPage();
      startY = sp(18);
    }

    doc.setFontSize(fs(11));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${name} (${group.length})`, margin, startY);
    startY += sp(2);
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(margin, startY, margin + sp(40), startY);
    startY += sp(4);

    const rows = group.map((e, i) => {
      const { aula, horario } = formatSchedules(e.schedules);
      const finished = e.status === "aprobado" || e.status === "reprobado";
      const nota = finished
        ? e.grade !== null && e.grade !== undefined
          ? String(e.grade)
          : "—"
        : "—";
      return [
        (i + 1).toString(),
        e.student_full_name,
        subjectLabel(e),
        aula,
        horario,
        STATUS_LABELS[e.status] || e.status,
        nota,
      ];
    });

    autoTable(doc, {
      startY,
      head: [
        ["#", "Estudiante", "Asignatura", "Aula", "Horario", "Estado", "Nota"],
      ],
      body: rows,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      styles: {
        fontSize: fs(7.5),
        cellPadding: sp(1.8),
        textColor: [55, 65, 81],
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: fs(7.5),
      },
      columnStyles: {
        0: { cellWidth: sp(10), halign: "center" },
        3: { cellWidth: sp(28) },
        4: { cellWidth: sp(42) },
        5: { cellWidth: sp(22), halign: "center" },
        6: { cellWidth: sp(16), halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const status = group[data.row.index]?.status;
          const bg = status ? STATUS_COLORS[status] : undefined;
          const fg = status ? STATUS_TEXT_COLORS[status] : undefined;
          if (bg) data.cell.styles.fillColor = bg;
          if (fg) data.cell.styles.textColor = fg;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    startY = lastTableY() + sp(8);
  });

  drawFooter();

  doc.save(`reporte_profesores_${now.toISOString().slice(0, 10)}.pdf`);
}
