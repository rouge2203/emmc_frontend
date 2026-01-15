import { useCallback, useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  MusicalNoteIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface InstrumentLoan {
  id: number;
  instrument: {
    id: number;
    instrument_type: {
      id: number;
      name: string;
    };
    serial_number: string | null;
  };
  loan_user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
  };
  loan_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string | null;
  price: number | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  prestado: {
    label: "Activo",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  devuelto: {
    label: "Devuelto",
    className: "bg-green-50 text-green-700 ring-green-600/20",
  },
};

const StudentInstrumentLoans = () => {
  const axiosPrivate = useAxiosPrivate();
  const [loans, setLoans] = useState<InstrumentLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<{ loans: InstrumentLoan[] }>(
        "instruments/student-loans"
      );
      setLoans(response.data.loans || []);
    } catch (err: any) {
      console.error("Error fetching instrument loans:", err);
      setError(
        err?.response?.data?.error ||
          "Error al cargar los alquileres de instrumentos"
      );
    } finally {
      setIsLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status === "prestado"),
    [loans]
  );
  const pastLoans = useMemo(
    () => loans.filter((loan) => loan.status !== "prestado"),
    [loans]
  );

  const LoanCard = ({ loan }: { loan: InstrumentLoan }) => {
    const statusStyle =
      statusLabels[loan.status || "prestado"] || statusLabels.prestado;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {loan.instrument.instrument_type.name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {loan.instrument.serial_number
                ? `Serie ${loan.instrument.serial_number}`
                : "Serie pendiente"}
            </p>
          </div>
          <div
            className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle.className}`}
          >
            {statusStyle.label}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            Inicio: {loan.loan_date || "Sin fecha"}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            Entrega: {loan.expected_return_date || "Sin fecha"}
          </span>
          {loan.actual_return_date && (
            <span className="inline-flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-gray-400" />
              Devuelto: {loan.actual_return_date}
            </span>
          )}
          {loan.price !== null && (
            <span className="inline-flex items-center gap-1">
              <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
              CRC {loan.price.toLocaleString("en-US")} / mes
            </span>
          )}
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
            onClick={() => fetchLoans()}
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
        <MusicalNoteIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Alquileres de instrumentos
          </h1>
          <p className="text-sm text-gray-600">
            Consulta el estado de tus instrumentos y fechas de devolucion.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Alquileres activos
            </h2>
          </div>
          {activeLoans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No tienes alquileres activos.
            </div>
          ) : (
            <div className="space-y-4">
              {activeLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Historial de alquileres
            </h2>
          </div>
          {pastLoans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay historial de alquileres.
            </div>
          ) : (
            <div className="space-y-4">
              {pastLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentInstrumentLoans;
