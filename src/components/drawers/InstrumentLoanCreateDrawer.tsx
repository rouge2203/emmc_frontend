import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

interface InstrumentType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface Instrument {
  id: number;
  instrument_type: InstrumentType;
  serial_number: string | null;
}

interface LoanUser {
  id: number;
  first_name: string;
  last_name: string;
}

interface InstrumentLoan {
  id: number;
  instrument: Instrument;
  loan_user: LoanUser;
  loan_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
}

interface InstrumentLoanCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoanCreated?: (newLoan: InstrumentLoan) => void;
  defaultInstrumentId?: number | null;
}

interface InstrumentLoanResponse {
  instrument_loan: InstrumentLoan;
}

interface InstrumentsResponse {
  results: Instrument[];
  pagination: any;
}

interface UsersResponse {
  results: LoanUser[];
  pagination: any;
}

const validationSchema = Yup.object({
  instrument_id: Yup.number()
    .required("El instrumento es obligatorio")
    .positive("Debe seleccionar un instrumento"),
  loan_user_id: Yup.number()
    .required("El usuario es obligatorio")
    .positive("Debe seleccionar un usuario"),
  expected_return_date: Yup.string().required(
    "La fecha de retorno esperada es obligatoria"
  ),
  loan_date: Yup.string().nullable(),
  price: Yup.number().nullable().min(0, "El precio debe ser mayor o igual a 0"),
});

const InstrumentLoanCreateDrawer: React.FC<InstrumentLoanCreateDrawerProps> = ({
  isOpen,
  onClose,
  onLoanCreated,
  defaultInstrumentId,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [instrumentId, setInstrumentId] = useState<number | null>(null);
  const [loanUserId, setLoanUserId] = useState<number | null>(null);
  const [loanDate, setLoanDate] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [notifyUser, setNotifyUser] = useState(true);

  // Searchable select states for instruments
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [showInstrumentDropdown, setShowInstrumentDropdown] = useState(false);
  const instrumentDropdownRef = useRef<HTMLDivElement>(null);

  // Searchable select states for users
  const [users, setUsers] = useState<LoanUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Fetch available instruments (status == "libre" or include defaultInstrumentId)
  const fetchInstruments = async (search: string = "") => {
    try {
      const params: any = {
        page: 1,
        page_size: 1000, // Get enough to find our instrument if needed
      };
      // Only filter by "libre" if no defaultInstrumentId is set
      // If defaultInstrumentId is set, we want to include that instrument even if it's "alquilado"
      if (!defaultInstrumentId) {
        params.status = "libre";
      }
      if (search) {
        // We'll filter on the frontend for now
      }
      const response = await axiosPrivate.get<InstrumentsResponse>(
        "instruments/manage-instruments",
        { params }
      );
      let filtered = response.data.results;
      // If defaultInstrumentId is set, ensure it's included even if status is "alquilado"
      if (defaultInstrumentId) {
        const defaultInst = filtered.find(
          (inst) => inst.id === defaultInstrumentId
        );
        if (!defaultInst) {
          // Fetch the specific instrument if not in results
          try {
            const allResponse = await axiosPrivate.get<InstrumentsResponse>(
              "instruments/manage-instruments",
              { params: { page: 1, page_size: 1000 } }
            );
            const found = allResponse.data.results.find(
              (inst) => inst.id === defaultInstrumentId
            );
            if (found) {
              filtered = [found, ...filtered];
            }
          } catch (err) {
            console.error("Error fetching default instrument:", err);
          }
        }
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (inst) =>
            inst.serial_number?.toLowerCase().includes(searchLower) ||
            inst.instrument_type.name.toLowerCase().includes(searchLower)
        );
      }
      setInstruments(filtered);
    } catch (err: any) {
      console.error("Error fetching instruments:", err);
      setInstruments([]);
    }
  };

  // Fetch users
  const fetchUsers = async (search: string = "") => {
    try {
      const requestData: any = {
        role: "all",
        page: 1,
        page_size: 50,
      };
      if (search) {
        requestData.search = search;
      }
      const response = await axiosPrivate.post<UsersResponse>(
        "users/get-users",
        requestData
      );
      setUsers(response.data.results);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  // Fetch specific instrument by ID
  const fetchInstrumentById = async (id: number) => {
    try {
      const response = await axiosPrivate.get<InstrumentsResponse>(
        "instruments/manage-instruments",
        {
          params: {
            page: 1,
            page_size: 1000, // Get enough to find our instrument
          },
        }
      );
      const foundInstrument = response.data.results.find(
        (inst) => inst.id === id
      );
      if (foundInstrument) {
        setInstrumentId(foundInstrument.id);
        setInstrumentSearch(
          `${foundInstrument.instrument_type.name}${
            foundInstrument.serial_number
              ? ` - ${foundInstrument.serial_number}`
              : ""
          }`
        );
      }
    } catch (err: any) {
      console.error("Error fetching instrument by ID:", err);
    }
  };

  // Initialize form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLoanDate(getTodayDate());
      fetchInstruments();
      fetchUsers();
      // Set default instrument if provided
      if (defaultInstrumentId) {
        fetchInstrumentById(defaultInstrumentId);
      }
    } else {
      // Reset form when drawer closes
      setInstrumentId(null);
      setLoanUserId(null);
      setLoanDate("");
      setExpectedReturnDate("");
      setPrice(null);
      setInstrumentSearch("");
      setUserSearch("");
      setShowInstrumentDropdown(false);
      setShowUserDropdown(false);
      setErrors({});
      setNotifyUser(true);
    }
  }, [isOpen, defaultInstrumentId]);

  // Filter instruments based on search
  useEffect(() => {
    if (isOpen && !instrumentId) {
      const timeoutId = setTimeout(() => {
        fetchInstruments(instrumentSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [instrumentSearch, isOpen, instrumentId]);

  // Filter users based on search
  useEffect(() => {
    if (isOpen && !loanUserId) {
      const timeoutId = setTimeout(() => {
        fetchUsers(userSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [userSearch, isOpen, loanUserId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        instrumentDropdownRef.current &&
        !instrumentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowInstrumentDropdown(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Validate form
  const validateForm = async () => {
    try {
      await validationSchema.validate(
        {
          instrument_id: instrumentId,
          loan_user_id: loanUserId,
          expected_return_date: expectedReturnDate,
          loan_date: loanDate || null,
          price: price,
        },
        { abortEarly: false }
      );
      setErrors({});
      return true;
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        validationError.inner.forEach((error) => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsCreating(true);
    try {
      const response = await axiosPrivate.post<InstrumentLoanResponse>(
        "instruments/manage-instruments-loans",
        {
          instrument_id: instrumentId,
          loan_user_id: loanUserId,
          loan_date: loanDate || null,
          expected_return_date: expectedReturnDate,
          price: price,
          status: "prestado",
          notify_user: notifyUser,
        }
      );

      setShowConfirmDialog(false);
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Notify parent component
      if (onLoanCreated && response.data?.instrument_loan) {
        onLoanCreated(response.data.instrument_loan);
      }

      // Reset form
      setInstrumentId(null);
      setLoanUserId(null);
      setLoanDate(getTodayDate());
      setExpectedReturnDate("");
      setPrice(null);
      setInstrumentSearch("");
      setUserSearch("");
      setErrors({});

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error creating loan:", err);
      setShowConfirmDialog(false);

      // Set error message for notification
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al crear el alquiler. Por favor, intenta de nuevo.";

      setErrorNotificationMessage(errorMessage);
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Check if required fields are filled and valid
  const isSubmitDisabled =
    !instrumentId || !loanUserId || !expectedReturnDate || isCreating;

  const selectedInstrument = instruments.find(
    (inst) => inst.id === instrumentId
  );
  const selectedUser = users.find((user) => user.id === loanUserId);

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Registrar Alquiler
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Completa la información para registrar un nuevo
                            alquiler de instrumento.
                          </p>
                        </div>
                        <div className="flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error message */}
                    {errors.submit && (
                      <div className="mx-4 mt-4 sm:mx-6">
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                          <p className="text-sm text-red-800">
                            {errors.submit}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
                      {/* Instrument Select */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="instrument"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Instrumento <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div
                          className="sm:col-span-2 relative"
                          ref={instrumentDropdownRef}
                        >
                          <input
                            type="text"
                            value={
                              selectedInstrument
                                ? `${selectedInstrument.instrument_type.name}${
                                    selectedInstrument.serial_number
                                      ? ` - ${selectedInstrument.serial_number}`
                                      : ""
                                  }`
                                : instrumentSearch
                            }
                            onChange={(e) => {
                              if (!defaultInstrumentId) {
                                setInstrumentSearch(e.target.value);
                                setShowInstrumentDropdown(true);
                                if (selectedInstrument) {
                                  setInstrumentId(null);
                                }
                              }
                            }}
                            onFocus={() => {
                              if (!defaultInstrumentId) {
                                setShowInstrumentDropdown(true);
                              }
                            }}
                            placeholder="Buscar por tipo o número de serie..."
                            disabled={!!defaultInstrumentId}
                            className={`block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              defaultInstrumentId
                                ? "bg-gray-50 cursor-not-allowed"
                                : "bg-white"
                            } ${
                              errors.instrument_id
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {showInstrumentDropdown &&
                            instruments.length > 0 &&
                            !defaultInstrumentId && (
                              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {instruments.map((instrument) => (
                                  <div
                                    key={instrument.id}
                                    onClick={() => {
                                      setInstrumentId(instrument.id);
                                      setInstrumentSearch("");
                                      setShowInstrumentDropdown(false);
                                    }}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900">
                                        {instrument.instrument_type.name}
                                      </span>
                                      {instrument.serial_number && (
                                        <span className="text-sm text-gray-500">
                                          {instrument.serial_number}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          {errors.instrument_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.instrument_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* User Select */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="loan_user"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Usuario <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div
                          className="sm:col-span-2 relative"
                          ref={userDropdownRef}
                        >
                          <input
                            type="text"
                            value={
                              selectedUser
                                ? `${selectedUser.first_name} ${selectedUser.last_name}`
                                : userSearch
                            }
                            onChange={(e) => {
                              setUserSearch(e.target.value);
                              setShowUserDropdown(true);
                              if (selectedUser) {
                                setLoanUserId(null);
                              }
                            }}
                            onFocus={() => setShowUserDropdown(true)}
                            placeholder="Buscar por nombre o apellido..."
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.loan_user_id
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {showUserDropdown && users.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => {
                                    setLoanUserId(user.id);
                                    setUserSearch("");
                                    setShowUserDropdown(false);
                                  }}
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                                >
                                  <span className="font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {errors.loan_user_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.loan_user_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Loan Date */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="loan_date"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Fecha de préstamo
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="date"
                            id="loan_date"
                            name="loan_date"
                            value={loanDate}
                            onChange={(e) => setLoanDate(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Expected Return Date */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="expected_return_date"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Fecha de retorno esperada{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="date"
                            id="expected_return_date"
                            name="expected_return_date"
                            value={expectedReturnDate}
                            onChange={(e) =>
                              setExpectedReturnDate(e.target.value)
                            }
                            min={loanDate || getTodayDate()}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.expected_return_date
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.expected_return_date && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.expected_return_date}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="price"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Precio (por mes)
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="flex items-center">
                            <span className="mr-2 text-gray-500">₡</span>
                            <input
                              type="number"
                              id="price"
                              name="price"
                              value={price ?? ""}
                              onChange={(e) =>
                                setPrice(
                                  e.target.value
                                    ? parseInt(e.target.value, 10)
                                    : null
                                )
                              }
                              min="0"
                              placeholder="0"
                              className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.price
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                            />
                          </div>
                          {errors.price && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.price}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Notify User Checkbox */}
                      <div className="space-y-2  px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="notify_user"
                            className="block text-sm/6  font-medium text-gray-900 sm:mt-1.5"
                          >
                            Notificación
                          </label>
                        </div>
                        <div className="sm:col-span-2  items-center flex">
                          <div className="flex items-center ">
                            <input
                              id="notify_user"
                              name="notify_user"
                              type="checkbox"
                              checked={notifyUser}
                              onChange={(e) => setNotifyUser(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label
                              htmlFor="notify_user"
                              className="ml-3 block text-sm text-gray-900"
                            >
                              Notificar al usuario por correo electrónico
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4">
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
                      onClick={handleSubmit}
                      disabled={isSubmitDisabled}
                      className="ml-4 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancel}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-gray-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar registro
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas registrar este alquiler? El
                      estado del instrumento se actualizará a "alquilado".
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isCreating}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isCreating ? "Registrando..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification - Rendered via Portal outside Dialog */}
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
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Alquiler registrado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El alquiler se ha registrado correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuccessNotification(false);
                          }}
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

      {/* Error Notification - Rendered via Portal outside Dialog */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showErrorNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon
                          aria-hidden="true"
                          className="size-6 text-red-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error al crear
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorNotificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowErrorNotification(false);
                          }}
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

export default InstrumentLoanCreateDrawer;
