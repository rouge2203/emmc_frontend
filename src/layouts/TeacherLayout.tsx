import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import useAuth from "../hooks/useAuth";
import useLogout from "../hooks/useLogout";

export default function TeacherLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { auth } = useAuth();
  const logout = useLogout();

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
        >
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link to="/teacher/dashboard" className="-m-1.5 p-1.5">
              <span className="sr-only">EMMC</span>
              <img
                src="/emmc_logo.png"
                alt="EMMC Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Abrir menú</span>
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
          </div>

          {/* Right side - User info */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-6">
            <span className="text-sm text-gray-700">
              Hola,{" "}
              <span className="font-semibold text-gray-900">
                {auth?.user?.first_name || "Profesor"}
              </span>
            </span>
            <button
              onClick={logout}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
          />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link to="/teacher/dashboard" className="-m-1.5 p-1.5">
                <span className="sr-only">EMMC</span>
                <img
                  src="/emmc_logo.png"
                  alt="EMMC Logo"
                  className="h-10 w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Cerrar menú</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {/* User greeting */}
                  <div className="px-3 py-2 text-base font-semibold text-gray-900">
                    Hola, {auth?.user?.first_name || "Profesor"}
                  </div>
                </div>
                <div className="py-6">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="-mx-3 block w-full rounded-lg px-3 py-2.5 text-left text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
