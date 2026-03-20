import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface EnrollmentOption {
  id: number;
  course_name: string;
  course_code: string;
  year: number;
  period: number;
  status: string;
}

interface PaymentCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentCreated?: () => void;
}

const PaymentCreateDrawer: React.FC<PaymentCreateDrawerProps> = ({
  isOpen,
  onClose,
  onPaymentCreated,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // User search
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Enrollments
  const [enrollments, setEnrollments] = useState<EnrollmentOption[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

  // Form fields
  const [paymentType, setPaymentType] = useState<string>("extra");
  const [amount, setAmount] = useState<number>(0);
  const [lateDue, setLateDue] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setUserSearch("");
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedUser(null);
      setEnrollments([]);
      setSelectedEnrollmentId("");
      setPaymentType("extra");
      setAmount(0);
      setLateDue("");
      setNote("");
      setError(null);
    }
  }, [isOpen]);

  // Debounced user search
  useEffect(() => {
    if (!userSearch || userSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await axiosPrivate.post("users/get-users", {
          search: userSearch,
          role: "all",
          page: 1,
          page_size: 20,
        });
        setSearchResults(response.data.results);
      } catch (err: any) {
        console.error("Error searching users:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearch]);

  // Fetch enrollments when user is selected
  useEffect(() => {
    if (!selectedUser) {
      setEnrollments([]);
      setSelectedEnrollmentId("");
      return;
    }

    const fetchEnrollments = async () => {
      try {
        setIsLoadingEnrollments(true);
        const response = await axiosPrivate.get("payments/user-enrollments", {
          params: { user_id: selectedUser.id },
        });
        setEnrollments(response.data.enrollments);
      } catch (err: any) {
        console.error("Error fetching enrollments:", err);
      } finally {
        setIsLoadingEnrollments(false);
      }
    };

    fetchEnrollments();
  }, [selectedUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearch(`${user.first_name} ${user.last_name}`);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserSearch("");
    setEnrollments([]);
    setSelectedEnrollmentId("");
  };

  const handleEnrollmentChange = (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    if (enrollmentId) {
      setPaymentType("enrollment");
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const payload: any = {
        user_id: selectedUser!.id,
        amount,
        late_due: lateDue,
        note,
        payment_type: paymentType,
      };

      if (selectedEnrollmentId) {
        payload.course_enrollment_id = parseInt(selectedEnrollmentId);
      }

      await axiosPrivate.post("payments/create-payment", payload);

      setShowSuccessNotification(true);

      if (onPaymentCreated) {
        onPaymentCreated();
      }

      setTimeout(() => {
        setShowSuccessNotification(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error creating payment:", err);
      setError(err?.response?.data?.error || "Error al crear el pago");
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid =
    selectedUser && amount > 0 && lateDue && paymentType;

  const getPeriodLabel = (period: number) => {
    if (period === 1) return "I";
    if (period === 2) return "II";
    if (period === 3) return "III";
    return String(period);
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-lg transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Crear Pago
                        </DialogTitle>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-300">
                          Crear un pago individual para un usuario.
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                      <div className="space-y-6">
                        {/* Section: User Search */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Usuario
                          </h4>

                          <div ref={studentDropdownRef} className="relative">
                            {selectedUser ? (
                              <div className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                                <span className="text-sm text-gray-900">
                                  {selectedUser.first_name}{" "}
                                  {selectedUser.last_name}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleClearUser}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  <XMarkIconSolid className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="relative">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                  {isSearchingUsers && (
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-900"></div>
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => {
                                      setUserSearch(e.target.value);
                                      setShowDropdown(true);
                                    }}
                                    onFocus={() => {
                                      if (searchResults.length > 0)
                                        setShowDropdown(true);
                                    }}
                                    placeholder="Buscar usuario..."
                                    className="block w-full rounded-md border-0 py-1.5 pl-9 pr-9 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                  />
                                </div>

                                {showDropdown && searchResults.length > 0 && (
                                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black/5 max-h-48 overflow-y-auto">
                                    {searchResults.map((user) => (
                                      <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleUserSelect(user)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                                      >
                                        {user.first_name} {user.last_name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Section: Enrollment (optional) */}
                        {selectedUser && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Matrícula (opcional)
                            </h4>

                            {isLoadingEnrollments ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                Cargando matrículas...
                              </div>
                            ) : enrollments.length > 0 ? (
                              <div className="grid grid-cols-1">
                                <select
                                  value={selectedEnrollmentId}
                                  onChange={(e) =>
                                    handleEnrollmentChange(e.target.value)
                                  }
                                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                >
                                  <option value="">Sin matrícula</option>
                                  {enrollments.map((enrollment) => (
                                    <option
                                      key={enrollment.id}
                                      value={enrollment.id}
                                    >
                                      {enrollment.course_code} -{" "}
                                      {enrollment.course_name} (
                                      {enrollment.year}-
                                      {getPeriodLabel(enrollment.period)})
                                    </option>
                                  ))}
                                </select>
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
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
                            ) : (
                              <p className="text-sm text-gray-500">
                                Este usuario no tiene matrículas registradas.
                              </p>
                            )}
                          </div>
                        )}

                        <hr className="border-gray-200" />

                        {/* Section: Payment Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Detalles del Pago
                          </h4>

                          <div className="space-y-4">
                            {/* Payment Type */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="createPaymentType"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5 flex items-center gap-1"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                                Tipo de pago
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <div className="grid grid-cols-1">
                                  <select
                                    id="createPaymentType"
                                    value={paymentType}
                                    onChange={(e) =>
                                      setPaymentType(e.target.value)
                                    }
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  >
                                    <option value="enrollment">
                                      Mensualidad
                                    </option>
                                    <option value="extra">Extra</option>
                                    <option value="anualidad">Matrícula</option>
                                  </select>
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
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
                            </div>

                            {/* Amount */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="createAmount"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                              >
                                Monto
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <div className="relative rounded-md shadow-sm">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">
                                      ₡
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    id="createAmount"
                                    value={amount || ""}
                                    onChange={(e) =>
                                      setAmount(parseInt(e.target.value) || 0)
                                    }
                                    min="0"
                                    placeholder="0"
                                    className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Late Due */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="createLateDue"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5 flex items-center gap-1"
                              >
                                <CalendarDaysIcon className="h-4 w-4" />
                                Vencimiento
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <input
                                  type="date"
                                  id="createLateDue"
                                  value={lateDue}
                                  onChange={(e) => setLateDue(e.target.value)}
                                  className="block w-full px-3 rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                />
                              </div>
                            </div>

                            {/* Note */}
                            <div className="space-y-2">
                              <label
                                htmlFor="createNote"
                                className="block text-sm font-medium text-gray-900"
                              >
                                Nota (opcional)
                              </label>
                              <textarea
                                id="createNote"
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Descripción del pago..."
                                className="block w-full rounded-md pl-3 border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Error */}
                        {error && (
                          <div className="rounded-md bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4 gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      disabled={isCreating}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!isFormValid || isCreating}
                      className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? "Creando..." : "Crear Pago"}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Success Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showSuccessNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-6 text-green-500"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Pago creado exitosamente
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El pago se ha creado correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSuccessNotification(false)}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid
                            aria-hidden="true"
                            className="size-5"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PaymentCreateDrawer;
