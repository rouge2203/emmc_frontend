import { useCallback, useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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
  loan_date: string | null;
  expected_return_date: string | null;
}

interface Payment {
  id: number;
  course_enrollment: number | null;
  instrument_loan: number | null;
  course_enrollment_info: CourseEnrollmentInfo | null;
  instrument_loan_info: InstrumentLoanInfo | null;
  payment_type: "enrollment" | "loan" | "anualidad" | null;
  amount: number | null;
  amount_paid: number | null;
  remaining_amount: number;
  late_due: string | null;
  status: string;
  is_overdue: boolean;
  updated_at: string;
  note: string | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  "en espera": {
    label: "En espera",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  incompleto: {
    label: "Incompleto",
    className: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  },
  completado: {
    label: "Completado",
    className: "bg-green-50 text-green-700 ring-green-600/20",
  },
};

const StudentPayments = () => {
  const axiosPrivate = useAxiosPrivate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<{ payments: Payment[] }>(
        "payments/student-payments"
      );
      const uniquePayments = Array.from(
        new Map(
          (response.data.payments || []).map((payment) => [payment.id, payment])
        ).values()
      );
      setPayments(uniquePayments);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setError(err?.response?.data?.error || "Error al cargar los pagos");
    } finally {
      setIsLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const parseDate = (value: string | null) =>
    value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;

  const pendingPayments = useMemo(() => {
    return payments
      .filter(
        (payment) => payment.status !== "completado" && payment.is_overdue
      )
      .sort((a, b) => parseDate(a.late_due) - parseDate(b.late_due));
  }, [payments]);

  const upcomingPayments = useMemo(() => {
    return payments
      .filter(
        (payment) => payment.status !== "completado" && !payment.is_overdue
      )
      .sort((a, b) => parseDate(a.late_due) - parseDate(b.late_due));
  }, [payments]);

  const completedPayments = useMemo(() => {
    return [...payments]
      .filter((payment) => payment.status === "completado")
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .slice(0, 5);
  }, [payments]);

  const formatAmount = (amount: number | null) => {
    const safeAmount = amount ?? 0;
    return `CRC ${safeAmount.toLocaleString("en-US")}`;
  };

  const getPaymentTitle = (payment: Payment) => {
    if (payment.payment_type === "enrollment" && payment.course_enrollment_info) {
      return `${payment.course_enrollment_info.course_name}`;
    }
    if (payment.payment_type === "loan" && payment.instrument_loan_info) {
      return `Alquiler ${payment.instrument_loan_info.instrument_type}`;
    }
    if (payment.note) {
      return payment.note;
    }
    return "Pago";
  };

  const getPaymentSubtitle = (payment: Payment) => {
    if (payment.payment_type === "enrollment" && payment.course_enrollment_info) {
      return `${payment.course_enrollment_info.course_code} - Periodo ${payment.course_enrollment_info.period} ${payment.course_enrollment_info.year}`;
    }
    if (payment.payment_type === "loan" && payment.instrument_loan_info) {
      return payment.instrument_loan_info.serial_number
        ? `Serie ${payment.instrument_loan_info.serial_number}`
        : "Instrumento";
    }
    return "Anualidad o servicio";
  };

  const PaymentCard = ({
    payment,
    variant,
  }: {
    payment: Payment;
    variant: "pending" | "upcoming";
  }) => {
    const statusStyle =
      statusLabels[payment.status] ||
      statusLabels["en espera"] ||
      statusLabels.incompleto;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {getPaymentTitle(payment)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {getPaymentSubtitle(payment)}
            </p>
          </div>
          <div
            className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle.className}`}
          >
            {statusStyle.label}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            {payment.late_due || "Sin fecha"}
          </span>
          {payment.is_overdue && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Atrasado
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {variant === "pending" ? "Pendiente" : "Pendiente"}
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {formatAmount(payment.remaining_amount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatAmount(payment.amount)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => fetchPayments()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <BanknotesIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-600">
            Puedes realizar pagos en la escuela y los cambios se reflejaran
            aqui.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Pendientes
            </h2>
          </div>
          {pendingPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No tienes pagos atrasados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pendingPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  variant="pending"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Proximos pagos
            </h2>
          </div>
          {upcomingPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No tienes pagos pendientes en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {upcomingPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  variant="upcoming"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Pagos completados
            </h2>
          </div>
          {completedPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay pagos completados aun.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Concepto
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Fecha
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Pagado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {completedPayments.map((payment) => (
                    <tr key={payment.id} className="text-sm text-gray-700">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {getPaymentTitle(payment)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getPaymentSubtitle(payment)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {payment.updated_at
                          ? new Date(payment.updated_at).toLocaleDateString(
                              "es-CR"
                            )
                          : "Sin fecha"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatAmount(payment.amount_paid)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatAmount(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentPayments;
