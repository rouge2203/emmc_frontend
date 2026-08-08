import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BanknotesIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { PiPianoKeys } from "react-icons/pi";

import useAuth from "../hooks/useAuth";
import useLogout from "../hooks/useLogout";

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function StudentLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { auth } = useAuth();
  const logout = useLogout();

  const navItems = [
    { name: "Inicio", href: "/student/dashboard", icon: HomeIcon },
    { name: "Pagos", href: "/student/pagos", icon: BanknotesIcon },
    { name: "Alquileres", href: "/student/alquileres", icon: MusicalNoteIcon },
    { name: "Instrumentos", href: "/student/instrumentos", icon: PiPianoKeys },
  ];

  const isNavItemActive = (href: string) => {
    if (href === "/student/dashboard") {
      return (
        location.pathname === "/student/dashboard" ||
        location.pathname.startsWith("/student/course")
      );
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 short:hidden">
        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <Link to="/student/dashboard" className="-m-1.5 p-1.5">
              <span className="sr-only">EMMC</span>
              <img
                src="/emmc_logo.png"
                alt="EMMC Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Abrir menu</span>
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-x-10">
            <div className="flex items-center gap-x-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={classNames(
                      isActive
                        ? "bg-gray-50 text-primary"
                        : "text-gray-600 hover:bg-gray-50 hover:text-primary",
                      "group inline-flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold transition"
                    )}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={classNames(
                        isActive
                          ? "text-primary"
                          : "text-gray-400 group-hover:text-primary",
                        "size-4"
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-6">
            <span className="text-sm text-gray-700">
              Hola,{" "}
              <span className="font-semibold text-gray-900">
                {auth?.user?.first_name || "Estudiante"}
              </span>
            </span>
            <button
              onClick={logout}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cerrar sesion
            </button>
          </div>
        </nav>

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
              <Link to="/student/dashboard" className="-m-1.5 p-1.5">
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
                <span className="sr-only">Cerrar menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  <div className="px-3 py-2 text-base font-semibold text-gray-900">
                    Hola, {auth?.user?.first_name || "Estudiante"}
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const isActive = isNavItemActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={classNames(
                            isActive
                              ? "bg-gray-50 text-primary"
                              : "text-gray-900 hover:bg-gray-50",
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-base/7 font-semibold"
                          )}
                        >
                          <item.icon
                            aria-hidden="true"
                            className={classNames(
                              isActive ? "text-primary" : "text-gray-500",
                              "size-5"
                            )}
                          />
                          {item.name}
                        </Link>
                      );
                    })}
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
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
