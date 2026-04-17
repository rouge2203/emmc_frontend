import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  CalendarIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import PaymentViewEditDrawer from "../../components/drawers/PaymentViewEditDrawer";
import PaymentRegisterDrawer from "../../components/drawers/PaymentRegisterDrawer";
import BulkCustomPaymentDrawer from "../../components/drawers/BulkCustomPaymentDrawer";
import PaymentCreateDrawer from "../../components/drawers/PaymentCreateDrawer";
import PrintPaymentReportDrawer from "../../components/drawers/PrintPaymentReportDrawer";
import useAuth from "../../hooks/useAuth";
import { CgFileDocument } from "react-icons/cg";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { generateIndividualPaymentReport } from "../../utils/generateIndividualPaymentReport";

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface CourseEnrollmentInfo {
  id: number;
  course_name: string;
  course_code: string;
  period: number;
  year: number;
}

interface InstrumentLoanInfo {
  id: number;
  instrument_type: string;
  serial_number: string | null;
  loan_date: string;
  expected_return_date: string;
}

interface Payment {
  id: number;
  user: User;
  course_enrollment: number | null;
  instrument_loan: number | null;
  course_enrollment_info: CourseEnrollmentInfo | null;
  instrument_loan_info: InstrumentLoanInfo | null;
  payment_type: "enrollment" | "loan" | "anualidad" | "extra" | null;
  amount: number;
  amount_paid: number | null;
  remaining_amount: number;
  late_due: string;
  status: string;
  is_overdue: boolean;
  updated_by: User | null;
  updated_at: string;
  note: string | null;
}

interface AnualidadItem {
  id: number;
  note: string;
  amount: number;
  amount_paid: number;
  remaining: number;
  status: string;
  late_due: string | null;
}

interface AnualidadesSummary {
  count: number;
  anualidades: AnualidadItem[];
  total_owed: number;
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

interface PaginatedResponse {
  results: Payment[];
  pagination: PaginationInfo;
}

interface StudentSummary {
  total_amount: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  overdue_payments_count: number;
  earliest_overdue_date: string | null;
  next_month_remaining: number;
  next_payment_date: string | null;
  by_status: {
    [key: string]: {
      count: number;
      total_amount: number;
      total_paid: number;
      remaining: number;
    };
  };
  next_payment: Payment | null;
}

interface OverdueTypeStat {
  count: number;
  total_due: number;
}

interface OverdueMonthStat {
  month: string;
  count: number;
  total_due: number;
}

interface OverdueStats {
  total_count: number;
  total_due: number;
  by_type: {
    enrollment: OverdueTypeStat;
    loan: OverdueTypeStat;
    anualidad: OverdueTypeStat;
    extra: OverdueTypeStat;
  };
  by_month: OverdueMonthStat[];
}

interface SearchUser {
  id: number;
  first_name: string;
  last_name: string;
}

interface UsersResponse {
  results: SearchUser[];
}

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SearchUser | null>(
    null,
  );
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Anualidades Summary
  const [anualidadesSummary, setAnualidadesSummary] =
    useState<AnualidadesSummary | null>(null);

  // Summary
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Drawers
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
    null,
  );
  const [isViewEditDrawerOpen, setIsViewEditDrawerOpen] = useState(false);
  const [isRegisterDrawerOpen, setIsRegisterDrawerOpen] = useState(false);
  const [registerStudentId, setRegisterStudentId] = useState<number | null>(
    null,
  );
  const [isBulkPaymentDrawerOpen, setIsBulkPaymentDrawerOpen] = useState(false);
  const [isCreatePaymentDrawerOpen, setIsCreatePaymentDrawerOpen] =
    useState(false);
  const [isPrintDrawerOpen, setIsPrintDrawerOpen] = useState(false);

  const fetchPayments = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };

      if (selectedStudent) {
        params.student_id = selectedStudent.id;
      }
      if (paymentTypeFilter) {
        params.payment_type = paymentTypeFilter;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (overdueFilter) {
        params.overdue = "true";
      }
      if (yearFilter) {
        params.year = yearFilter;
      }
      if (periodFilter) {
        params.period = periodFilter;
      }

      const response = await axiosPrivate.get<PaginatedResponse>(
        "payments/manage-payments",
        { params },
      );

      setPayments(response.data.results);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setError(err?.response?.data?.error || "Error al cargar los pagos");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentSummary = async () => {
    if (!selectedStudent) {
      setSummary(null);
      return;
    }

    try {
      const params: any = {
        student_id: selectedStudent.id,
      };
      if (paymentTypeFilter) {
        params.payment_type = paymentTypeFilter;
      }
      if (yearFilter) {
        params.year = yearFilter;
      }
      if (periodFilter) {
        params.period = periodFilter;
      }

      const response = await axiosPrivate.get<StudentSummary>(
        "payments/student-summary",
        { params },
      );
      setSummary(response.data);
    } catch (err: any) {
      console.error("Error fetching summary:", err);
    }
  };

  const fetchAnualidadesSummary = async () => {
    if (!selectedStudent) {
      setAnualidadesSummary(null);
      return;
    }

    try {
      const response = await axiosPrivate.get<AnualidadesSummary>(
        "payments/anualidades-summary",
        { params: { student_id: selectedStudent.id } },
      );
      setAnualidadesSummary(response.data);
    } catch (err: any) {
      console.error("Error fetching anualidades summary:", err);
    }
  };

  const showOverdueStats = overdueFilter && !selectedStudent;

  const fetchOverdueStats = async () => {
    try {
      const params: any = {};
      if (paymentTypeFilter) params.payment_type = paymentTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (yearFilter) params.year = yearFilter;
      if (periodFilter) params.period = periodFilter;

      const response = await axiosPrivate.get<OverdueStats>(
        "payments/overdue-stats",
        { params },
      );
      setOverdueStats(response.data);
    } catch (err: any) {
      console.error("Error fetching overdue stats:", err);
    }
  };

  const searchStudents = async (search: string) => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axiosPrivate.post<UsersResponse>(
        "users/get-users",
        {
          search,
          role: "all",
          page: 1,
          page_size: 20,
        },
      );
      setSearchResults(response.data.results);
    } catch (err: any) {
      console.error("Error searching students:", err);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const response = await axiosPrivate.get<{ years: number[] }>(
        "payments/available-years",
      );
      setAvailableYears(response.data.years);
    } catch (err: any) {
      console.error("Error fetching available years:", err);
    }
  };

  // Effect for debounced student search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchStudents(studentSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [studentSearch]);

  // Effect to fetch available years on mount
  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    const studentIdParam = searchParams.get("student_id");
    if (studentIdParam) {
      const studentId = parseInt(studentIdParam);
      if (!isNaN(studentId)) {
        axiosPrivate
          .get("users/get-user-info", { params: { id: studentId } })
          .then((res) => {
            const user = res.data.user;
            handleStudentSelect({
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
            });
          })
          .catch((err) => console.error("Error fetching student info:", err));
        setSearchParams({});
      }
    }
  }, []);

  // Effect to fetch payments when filters change
  useEffect(() => {
    fetchPayments(page);
  }, [
    page,
    selectedStudent,
    paymentTypeFilter,
    statusFilter,
    overdueFilter,
    yearFilter,
    periodFilter,
  ]);

  // Effect to fetch summary when student or filters change
  useEffect(() => {
    fetchStudentSummary();
  }, [selectedStudent, paymentTypeFilter, yearFilter, periodFilter]);

  // Effect to fetch anualidades summary when student changes
  useEffect(() => {
    fetchAnualidadesSummary();
  }, [selectedStudent]);

  // Effect to fetch overdue stats when "Vencidos" is the active scope
  useEffect(() => {
    if (showOverdueStats) {
      fetchOverdueStats();
    } else {
      setOverdueStats(null);
    }
  }, [
    overdueFilter,
    selectedStudent,
    paymentTypeFilter,
    statusFilter,
    yearFilter,
    periodFilter,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStudentSelect = (student: SearchUser) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.first_name} ${student.last_name}`);
    setShowStudentDropdown(false);
    setPage(1);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setSummary(null);
    setAnualidadesSummary(null);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setPaymentTypeFilter("");
    setStatusFilter("");
    setOverdueFilter(false);
    setYearFilter("");
    setPeriodFilter("");
    setSummary(null);
    setAnualidadesSummary(null);
    setPage(1);
  };

  const hasActiveFilters =
    selectedStudent ||
    paymentTypeFilter ||
    statusFilter ||
    overdueFilter ||
    yearFilter ||
    periodFilter;

  const handleViewPayment = (payment: Payment) => {
    setSelectedPaymentId(payment.id);
    setIsViewEditDrawerOpen(true);
  };

  const handleRegisterPayment = (payment: Payment) => {
    // Auto-select the student in search filter
    setSelectedStudent({
      id: payment.user.id,
      first_name: payment.user.first_name,
      last_name: payment.user.last_name,
    });
    setStudentSearch(`${payment.user.first_name} ${payment.user.last_name}`);

    // Pass student ID to the drawer
    setRegisterStudentId(payment.user.id);
    setIsRegisterDrawerOpen(true);
  };

  const handlePaymentUpdated = () => {
    fetchPayments(page);
    fetchStudentSummary();
  };

  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState(false);

  const handleIndividualReport = async () => {
    if (!selectedStudent) return;
    try {
      setIsGeneratingIndividual(true);

      const params: any = {
        page: 1,
        page_size: 10000,
        student_id: selectedStudent.id,
      };
      if (paymentTypeFilter) params.payment_type = paymentTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (overdueFilter) params.overdue = "true";
      if (yearFilter) params.year = yearFilter;
      if (periodFilter) params.period = periodFilter;

      const response = await axiosPrivate.get("payments/manage-payments", {
        params,
      });

      const studentName =
        `${selectedStudent.first_name} ${selectedStudent.last_name || ""}`.trim();
      const userName = auth?.user
        ? `${auth.user.first_name} ${auth.user.last_name}`
        : "Admin";

      await generateIndividualPaymentReport(
        response.data.results,
        studentName,
        userName,
      );
    } catch (err: any) {
      console.error("Error generating individual report:", err);
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
      // Django stores datetimes in UTC, but we only need the date
      const datePart = dateString.split("T")[0].split(" ")[0];
      const [year, month, day] = datePart.split("-").map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString("es-CR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (amount: number) => {
    return `₡${amount?.toLocaleString() || 0}`;
  };

  const formatMonth = (yearMonth: string) => {
    const [yearStr, monthStr] = yearMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return yearMonth;
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "short",
    });
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== "completado") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
          <ExclamationCircleIcon className="h-3 w-3" />
          Vencido
        </span>
      );
    }

    const styles: Record<string, string> = {
      "en espera": "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
      completado: "bg-green-50 text-green-700 ring-green-600/20",
      incompleto: "bg-orange-50 text-orange-700 ring-orange-600/20",
    };

    const labels: Record<string, string> = {
      "en espera": "En espera",
      completado: "Completado",
      incompleto: "Incompleto",
    };

    return (
      <span
        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
          styles[status] || "bg-gray-50 text-gray-700 ring-gray-600/20"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentTypeBadge = (paymentType: string | null) => {
    if (paymentType === "enrollment") {
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20">
          Mensualidades
        </span>
      );
    } else if (paymentType === "loan") {
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20">
          Alquiler
        </span>
      );
    } else if (paymentType === "anualidad") {
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
          Matrícula
        </span>
      );
    } else if (paymentType === "extra") {
      return (
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
          Extra
        </span>
      );
    }
    return null;
  };

  if (error && !isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto flex items-start sm:items-center gap-2">
          <BanknotesIcon className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Gestión de pagos de matrículas y alquileres.
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 mt-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <XMarkIcon className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Student Search */}
            <div className="flex-1 relative" ref={studentDropdownRef}>
              <label
                htmlFor="studentSearch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="studentSearch"
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                    if (selectedStudent) {
                      setSelectedStudent(null);
                    }
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Nombre o apellido..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={handleClearStudent}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              {showStudentDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleStudentSelect(user)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                    >
                      <span className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Type Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="paymentTypeFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <BanknotesIcon className="h-4 w-4" />
                Tipo de pago
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="paymentTypeFilter"
                  value={paymentTypeFilter}
                  onChange={(e) => {
                    setPaymentTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos</option>
                  <option value="enrollment">Mensualidades</option>
                  <option value="loan">Alquileres</option>
                  <option value="anualidad">Matrícula</option>
                  <option value="extra">Extra</option>
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="statusFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <ClockIcon className="h-4 w-4" />
                Estado
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos</option>
                  <option value="en espera">En espera</option>
                  <option value="completado">Completado</option>
                  <option value="incompleto">Incompleto</option>
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Overdue Filter */}
            <div className="sm:w-48 flex items-end">
              <button
                type="button"
                onClick={() => {
                  setOverdueFilter(!overdueFilter);
                  setPage(1);
                }}
                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  overdueFilter
                    ? "bg-red-100 text-red-700 ring-1 ring-red-600/20"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ExclamationCircleIcon className="h-4 w-4" />
                Vencidos
              </button>
            </div>
          </div>

          {/* Second Row: Year and Period Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Year Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="yearFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Año (Matrícula)
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="yearFilter"
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Period Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="periodFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <CalendarDaysIcon className="h-4 w-4" />
                Período (Matrícula)
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="periodFilter"
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(e.target.value);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos</option>
                  <option value="1">I</option>
                  <option value="2">II</option>
                  <option value="3">III</option>
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Payment Creation Buttons */}
            <div className="sm:w-auto flex items-end gap-2">
              {selectedStudent ? (
                <button
                  type="button"
                  onClick={handleIndividualReport}
                  disabled={isGeneratingIndividual}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LiaFileInvoiceDollarSolid className="size-4" />
                  {isGeneratingIndividual
                    ? "Generando..."
                    : "Imprimir reporte individual"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPrintDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                >
                  <CgFileDocument className="size-4" />
                  Imprimir reporte
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCreatePaymentDrawerOpen(true)}
                className="px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Crear pago individual
              </button>
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-md text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Crear pagos generales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Stats Panel (when "Vencidos" filter active and no student selected) */}
      {showOverdueStats && overdueStats && (
        <div className="mb-6 space-y-4">
          {/* Top row: total count + total due */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-900">
                    Pagos vencidos
                  </p>
                  <p className="text-lg font-semibold text-red-700">
                    {overdueStats.total_count.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-900">
                    Total adeudado
                  </p>
                  <p className="text-lg font-semibold text-red-700">
                    {formatCurrency(overdueStats.total_due)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* By type */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Por tipo</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  {
                    key: "enrollment" as const,
                    label: "Mensualidades",
                    accent: "bg-gray-50 text-gray-700 ring-gray-600/20",
                  },
                  {
                    key: "loan" as const,
                    label: "Alquiler",
                    accent: "bg-gray-50 text-gray-700 ring-gray-600/20",
                  },
                  {
                    key: "anualidad" as const,
                    label: "Matrícula",
                    accent: "bg-purple-50 text-purple-700 ring-purple-600/20",
                  },
                  {
                    key: "extra" as const,
                    label: "Extra",
                    accent: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
                  },
                ]
              ).map(({ key, label, accent }) => {
                const stat = overdueStats.by_type[key];
                return (
                  <div
                    key={key}
                    className="rounded-md border border-gray-200 p-3"
                  >
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${accent}`}
                    >
                      {label}
                    </span>
                    <p className="mt-2 text-base font-semibold text-gray-900">
                      {stat.count.toLocaleString()} pago(s)
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(stat.total_due)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By month */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Por mes</h3>
            {overdueStats.by_month.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay pagos vencidos en el rango seleccionado.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {overdueStats.by_month.map((m) => (
                  <div
                    key={m.month}
                    className="flex-shrink-0 min-w-[140px] rounded-md border border-gray-200 p-3"
                  >
                    <p className="text-xs font-medium uppercase text-gray-500">
                      {formatMonth(m.month)}
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {m.count.toLocaleString()} pago(s)
                    </p>
                    <p className="text-sm text-red-600">
                      {formatCurrency(m.total_due)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards (when student selected) */}
      {selectedStudent && summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(summary.total_amount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pagado</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(summary.total_paid)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pendiente</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatCurrency(summary.total_pending)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Vencido</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(summary.total_overdue)}
                  </p>
                  {summary.overdue_payments_count > 0 && (
                    <p className="text-xs text-gray-500">
                      {summary.overdue_payments_count} pago(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anualidades Summary Box (when student selected and has pending anualidades) */}
      {selectedStudent &&
        anualidadesSummary &&
        anualidadesSummary.count > 0 && (
          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="h-5 w-5 text-purple-500" />
                    <h4 className="text-sm font-medium text-purple-900">
                      Matrícula Pendiente
                    </h4>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {anualidadesSummary.anualidades.map((anualidad) => (
                      <span
                        key={anualidad.id}
                        className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700"
                      >
                        {anualidad.note} - {formatCurrency(anualidad.remaining)}
                      </span>
                    ))}
                  </div>
                  <p className="text-lg font-semibold text-purple-700 mt-2">
                    Total: {formatCurrency(anualidadesSummary.total_owed)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Next Payment Card (when student selected) */}
      {selectedStudent &&
        summary &&
        (summary.total_overdue > 0 || summary.next_month_remaining > 0) && (
          <div className="mb-6">
            {summary.total_overdue > 0 ? (
              /* Overdue payments - show in red */
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      <h4 className="text-sm font-medium text-red-900">
                        Pendiente de pago
                      </h4>
                    </div>
                    <p className="text-lg font-semibold text-red-700 mt-1">
                      {formatCurrency(summary.total_overdue)}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>
                        Pendiente desde:{" "}
                        {formatDate(summary.earliest_overdue_date || "")}
                      </span>
                    </div>
                    <p className="text-xs text-red-500 mt-1">
                      {summary.overdue_payments_count} pago(s) vencido(s)
                    </p>
                  </div>
                  {summary.next_payment && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRegisterPayment(summary.next_payment!)
                      }
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                    >
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            ) : summary.next_month_remaining > 0 ? (
              /* Next month payments - show in blue */
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Próximo pago
                    </h4>
                    <p className="text-lg font-semibold text-blue-700 mt-1">
                      {formatCurrency(summary.next_month_remaining)}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      <span>
                        Vence: {formatDate(summary.next_payment_date || "")}
                      </span>
                    </div>
                  </div>
                  {summary.next_payment && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRegisterPayment(summary.next_payment!)
                      }
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      Registrar pago
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

      {/* Table */}
      <div className="mt-2 sm:mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="sm:border sm:border-gray-300 sm:rounded-x-md sm:rounded-t-md sm:py-2 sm:px-4">
              <table className="relative min-w-full divide-y divide-gray-300">
                <thead className="">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      Usuario
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Tipo
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Descripción
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Monto
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Pagado
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Vencimiento
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Estado
                    </th>
                    <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                      >
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                      >
                        No se encontraron pagos
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                          <div className="font-medium text-gray-900">
                            {payment.user.first_name} {payment.user.last_name}
                          </div>
                        </td>
                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                          {getPaymentTypeBadge(payment.payment_type)}
                        </td>
                        <td className="px-3 py-5 text-sm text-gray-500">
                          {payment.course_enrollment_info ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {payment.course_enrollment_info.course_code}
                              </div>
                              <div className="text-gray-500">
                                {payment.course_enrollment_info.course_name}
                              </div>
                            </div>
                          ) : payment.instrument_loan_info ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {payment.instrument_loan_info.instrument_type}
                              </div>
                              {payment.instrument_loan_info.serial_number && (
                                <div className="text-gray-500">
                                  {payment.instrument_loan_info.serial_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-3 py-5 text-sm whitespace-nowrap font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                          {formatCurrency(payment.amount_paid || 0)}
                        </td>
                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                          <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-4 w-4" />
                            {formatDate(payment.late_due)}
                          </div>
                        </td>
                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                          {getStatusBadge(payment.status, payment.is_overdue)}
                        </td>
                        <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleViewPayment(payment)}
                              className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold border py-0.5 px-2 rounded-sm"
                            >
                              Detalles
                            </button>
                            {payment.status !== "completado" && (
                              <button
                                onClick={() => handleRegisterPayment(payment)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold border py-0.5 px-2 rounded-sm"
                              >
                                Pagar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between sm:shadow-sm sm:border-b sm:border-x sm:border-gray-300 sm:rounded-b-md bg-white px-4 py-3 sm:px-6"
              >
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-700">
                    Mostrando{" "}
                    <span className="font-medium">
                      {pagination.page_size * (pagination.page - 1) + 1}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page_size * pagination.page,
                        pagination.total_count,
                      )}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium">
                      {pagination.total_count}
                    </span>{" "}
                    resultados
                  </p>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.has_previous || isLoading}
                    className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.has_next || isLoading}
                    className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Drawers */}
      <PaymentViewEditDrawer
        paymentId={selectedPaymentId}
        isOpen={isViewEditDrawerOpen}
        onClose={() => {
          setIsViewEditDrawerOpen(false);
          setSelectedPaymentId(null);
        }}
        onPaymentUpdated={handlePaymentUpdated}
      />

      <PaymentRegisterDrawer
        isOpen={isRegisterDrawerOpen}
        onClose={() => {
          setIsRegisterDrawerOpen(false);
          setRegisterStudentId(null);
        }}
        studentId={registerStudentId}
        onPaymentRegistered={handlePaymentUpdated}
      />

      <BulkCustomPaymentDrawer
        isOpen={isBulkPaymentDrawerOpen}
        onClose={() => setIsBulkPaymentDrawerOpen(false)}
        onPaymentsCreated={handlePaymentUpdated}
        availableYears={availableYears}
      />

      <PaymentCreateDrawer
        isOpen={isCreatePaymentDrawerOpen}
        onClose={() => setIsCreatePaymentDrawerOpen(false)}
        onPaymentCreated={handlePaymentUpdated}
      />

      <PrintPaymentReportDrawer
        isOpen={isPrintDrawerOpen}
        onClose={() => setIsPrintDrawerOpen(false)}
        availableYears={availableYears}
        axiosPrivate={axiosPrivate}
        userName={
          auth?.user
            ? `${auth.user.first_name} ${auth.user.last_name}`
            : "Admin"
        }
      />
    </div>
  );
};

export default Payments;
