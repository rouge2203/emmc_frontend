import { useEffect, useRef, useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  Bars3Icon,
  CalendarIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  BellIcon,
  BanknotesIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { HomeIcon as HomeIconSolid } from "@heroicons/react/20/solid";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { LiaUserTieSolid } from "react-icons/lia";
import { MdOutlineInventory } from "react-icons/md";
import {
  PiArrowCounterClockwiseFill,
  PiGuitar,
  PiListBulletsBold,
  PiPianoKeys,
} from "react-icons/pi";
import {
  HiOutlineBuildingLibrary,
  HiOutlineAcademicCap,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";
import { LuListChecks, LuBadgePercent } from "react-icons/lu";

import useAuth from "../hooks/useAuth";
import useLogout from "../hooks/useLogout";
import {
  createSidebarRouteChangeUpdater,
  initialDesktopSidebarState,
  sidebarStateAfterToggle,
} from "./adminSidebarState";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: HomeIcon,
    current: false,
  },
  {
    name: "Usuarios",
    icon: UsersIcon,
    current: false,
    children: [
      {
        name: "Administradores",
        href: "/admin/administradores",
        icon: LiaUserTieSolid,
      },
      {
        name: "Profesores",
        href: "/admin/profesores",
        icon: LiaChalkboardTeacherSolid,
      },
      {
        name: "Estudiantes",
        href: "/admin/estudiantes",
        icon: PiStudent,
      },
      {
        name: "Becados",
        href: "/admin/becados",
        icon: LuBadgePercent,
      },
    ],
  },
  {
    name: "Instrumentos",
    icon: PiGuitar,
    current: false,
    children: [
      {
        name: "Registro",
        href: "/admin/instrumentos/registro",
        icon: PiListBulletsBold,
      },
      {
        name: "Inventario",
        href: "/admin/instrumentos/inventario",
        icon: MdOutlineInventory,
      },
      {
        name: "Alquileres",
        href: "/admin/instrumentos/alquileres",
        icon: PiArrowCounterClockwiseFill,
      },
    ],
  },
  {
    name: "Carrera",
    href: "/admin/catedra",
    icon: HiOutlineBuildingLibrary,
    current: false,
  },
  {
    name: "Aulas",
    href: "/admin/aulas",
    icon: HiOutlineBuildingOffice2,
    current: false,
  },
  {
    name: "Cursos",
    href: "/admin/cursos",
    icon: HiOutlineAcademicCap,
    current: false,
  },
  {
    name: "Cursos Matriculados",
    href: "/admin/cursos-matriculados",
    icon: LuListChecks,
    current: false,
  },
  {
    name: "Centro de Pagos",
    href: "/admin/centro-de-pagos",
    icon: BanknotesIcon,
    current: false,
  },
  {
    name: "Calendario de Cursos",
    href: "/admin/calendario-de-cursos",
    icon: CalendarIcon,
    current: false,
  },
  {
    name: "Asignación de Horarios",
    href: "/admin/asignacion-de-horarios",
    icon: TableCellsIcon,
    current: false,
  },
  {
    name: "Noticias",
    href: "/admin/news",
    icon: FolderIcon,
    current: false,
  },
  {
    name: "Sala de práctica",
    href: "/admin/instrumentos/practica",
    icon: PiPianoKeys,
    current: false,
  },
];

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(() =>
    initialDesktopSidebarState(location.pathname),
  );
  const [desktopGroupToOpen, setDesktopGroupToOpen] = useState<string | null>(null);
  const previousPath = useRef(location.pathname);
  const { auth } = useAuth();
  const logout = useLogout();

  useEffect(() => {
    const nextPath = location.pathname;
    const updateSidebar = createSidebarRouteChangeUpdater(
      previousPath.current,
      nextPath,
    );
    previousPath.current = nextPath;
    setDesktopSidebar(updateSidebar);
  }, [location.pathname]);

  const toggleDesktopSidebar = () => {
    setDesktopSidebar((current) =>
      sidebarStateAfterToggle({ path: location.pathname, ...current }),
    );
  };

  const expandDesktopGroup = (name: string) => {
    setDesktopGroupToOpen(name);
    setDesktopSidebar((current) =>
      current.expanded
        ? current
        : sidebarStateAfterToggle({ path: location.pathname, ...current }),
    );
  };

  // Update navigation with current route
  const navigationWithCurrent = navigation.map((item) => {
    if (item.children) {
      const hasActiveChild = item.children.some(
        (child) => location.pathname === child.href
      );
      return { ...item, current: hasActiveChild };
    }
    return { ...item, current: location.pathname === item.href };
  });

  // Get user initials for profile
  const getUserInitials = () => {
    if (auth?.user?.username) {
      return auth.user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Generate breadcrumbs based on current route
  const generateBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);

    const breadcrumbs: Array<{ name: string; href: string; current: boolean }> =
      [];

    // Map route segments to readable names
    const routeMap: Record<string, string> = {
      dashboard: "Dashboard",
      teams: "Teams",
      projects: "Projects",
      calendar: "Calendar",
      instrumentos: "Instrumentos",
      administradores: "Administradores",
      estudiantes: "Estudiantes",
      becados: "Becados",
      catedra: "Catedra",
      cursos: "Cursos",
      "cursos-matriculados": "Cursos Matriculados",
      "enrollment-grades": "Notas del curso",
      "centro-de-pagos": "Centro de Pagos",
      "calendario-de-cursos": "Calendario de Cursos",
      "asignacion-de-horarios": "Asignación de Horarios",
      news: "Noticias",
    };

    // Map detail routes to readable names
    const detailRouteMap: Record<string, string> = {
      registro: "Registro",
      inventario: "Inventario",
      practica: "Sala de práctica",
    };

    if (segments.length >= 2 && segments[1] === "dashboard") {
      // On dashboard page - just show Dashboard
      breadcrumbs.push({
        name: "Dashboard",
        href: "/admin/dashboard",
        current: true,
      });
    } else if (segments.length >= 2) {
      const mainRoute = segments[1];
      const mainName =
        routeMap[mainRoute] ||
        mainRoute.charAt(0).toUpperCase() + mainRoute.slice(1);

      if (segments.length === 2) {
        // Just the main route (e.g., /admin/teams)
        breadcrumbs.push({
          name: mainName,
          href: `/admin/${mainRoute}`,
          current: true,
        });
      } else {
        // Main route + detail (e.g., /admin/teams/Engineering)
        // Special case: enrollment-grades should show "Cursos Matriculados" as parent
        if (mainRoute === "enrollment-grades") {
          breadcrumbs.push({
            name: "Cursos Matriculados",
            href: "/admin/cursos-matriculados",
            current: false,
          });
          breadcrumbs.push({ name: "Notas del curso", href: path, current: true });
        } else {
          breadcrumbs.push({
            name: mainName,
            href: `/admin/${mainRoute}`,
            current: false,
          });
          const detailSegment = decodeURIComponent(segments[2]);
          const detailName =
            detailRouteMap[detailSegment] ||
            detailSegment.charAt(0).toUpperCase() + detailSegment.slice(1);
          breadcrumbs.push({ name: detailName, href: path, current: true });
        }
      }
    } else {
      // Fallback to Dashboard
      breadcrumbs.push({
        name: "Dashboard",
        href: "/admin/dashboard",
        current: true,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const userNavigation = [
    // Template placeholder — desktop only until a real profile page exists
    { name: "Tu perfil", href: "#", mobileHidden: true },
    { name: "Cerrar sesión", onClick: logout },
  ];

  const renderNavigationItem = (
    item: (typeof navigation)[0],
    {
      collapsed = false,
      mobile = false,
    }: { collapsed?: boolean; mobile?: boolean } = {},
  ) => {
    if (!item.children) {
      return (
        <li key={item.name}>
          <Link
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            title={collapsed ? item.name : undefined}
            className={classNames(
              item.current
                ? "bg-gray-50 text-primary"
                : "text-gray-600 hover:bg-gray-50 hover:text-primary",
              collapsed ? "justify-center gap-x-0" : "gap-x-3",
              "group flex overflow-hidden rounded-md p-2 text-sm/6 font-semibold transition-[gap] duration-300",
            )}
          >
            {item.icon && (
              <item.icon
                aria-hidden="true"
                className={classNames(
                  item.current
                    ? "text-primary"
                    : "text-gray-600 group-hover:text-primary",
                  "size-6 shrink-0"
                )}
              />
            )}
            <span
              className={classNames(
                collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100",
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200",
              )}
            >
              {item.name}
            </span>
          </Link>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Disclosure
          key={
            mobile
              ? item.name
              : `${item.name}-${desktopGroupToOpen === item.name ? "requested" : "normal"}`
          }
          as="div"
          defaultOpen={
            (!mobile && desktopGroupToOpen === item.name) ||
            item.name === "Usuarios" ||
            (item.name === "Instrumentos" &&
              item.children?.some((child) => location.pathname === child.href))
          }
        >
          <DisclosureButton
            onClick={() => {
              if (collapsed) expandDesktopGroup(item.name);
            }}
            title={collapsed ? item.name : undefined}
            className={classNames(
              item.current ? "bg-gray-50 text-primary" : "hover:bg-gray-50",
              collapsed ? "justify-center gap-x-0" : "gap-x-3",
              "group flex w-full items-center overflow-hidden rounded-md p-2 text-left text-sm/6 font-semibold text-gray-700 transition-[gap] duration-300 hover:text-primary",
            )}
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={classNames(
                collapsed ? "w-0 opacity-0" : "w-5 opacity-100",
                "h-5 shrink-0 text-gray-400 transition-[width,opacity,transform] duration-300 group-data-open:rotate-90 group-data-open:text-gray-500",
              )}
            />
            {item.icon && (
              <item.icon
                aria-hidden="true"
                className={classNames(
                  item.current
                    ? "text-primary group-data-open:text-gray-600"
                    : "text-gray-600 group-hover:text-primary",
                  "size-6 shrink-0"
                )}
              />
            )}
            <span
              className={classNames(
                item.current ? "group-data-open:text-gray-600" : "",
                collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100",
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200",
              )}
            >
              {item.name}
            </span>
          </DisclosureButton>
          <DisclosurePanel
            as="ul"
            className={classNames(collapsed ? "hidden" : "block", "mt-1 px-2")}
          >
            {item.children.map((subItem) => {
              const isActive = location.pathname === subItem.href;
              return (
                <li key={subItem.name}>
                  <DisclosureButton
                    as={Link}
                    to={subItem.href}
                    onClick={() => setSidebarOpen(false)}
                    className={classNames(
                      isActive ? "bg-gray-50 text-primary" : "hover:bg-gray-50",
                      "rounded-md py-2 pr-2 pl-9 text-sm/6 text-gray-700 flex gap-x-2 items-center"
                    )}
                  >
                    {subItem.icon && (
                      <subItem.icon
                        aria-hidden="true"
                        className={classNames(
                          isActive
                            ? "text-primary"
                            : "text-gray-600 group-hover:text-primary",
                          "size-5 shrink-0"
                        )}
                      />
                    )}
                    {subItem.name}
                  </DisclosureButton>
                </li>
              );
            })}
          </DisclosurePanel>
        </Disclosure>
      </li>
    );
  };

  const SidebarContent = ({
    collapsed = false,
    mobile = false,
  }: {
    collapsed?: boolean;
    mobile?: boolean;
  }) => (
    <div
      className={classNames(
        collapsed ? "px-3" : "px-6",
        "flex grow flex-col gap-y-5 overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-white transition-[padding] duration-300 ease-in-out",
      )}
    >
      <div
        className={classNames(
          collapsed ? "justify-center" : "justify-start",
          "flex h-16 shrink-0 items-center",
        )}
      >
        <img
          alt="EMMC Logo"
          src="/emmc_logo.png"
          className={classNames(
            collapsed ? "mt-0 h-11" : "mt-6 h-16",
            "w-auto transition-all duration-300",
          )}
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigationWithCurrent.map((item) =>
                renderNavigationItem(item, { collapsed, mobile }),
              )}
            </ul>
          </li>
          <li className={classNames(collapsed ? "-mx-3" : "-mx-6", "mt-auto")}>
            <div
              className={classNames(
                collapsed ? "flex-col gap-y-2 px-3" : "gap-x-4 px-6",
                "flex items-center py-3 transition-all duration-300",
              )}
            >
              <div
                translate="no"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold"
              >
                {getUserInitials()}
              </div>
              <div
                className={classNames(
                  collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100",
                  "min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-200",
                )}
              >
                <p className="text-sm/6 font-semibold text-gray-900 truncate">
                  {auth?.user?.first_name + " " + auth?.user?.last_name ||
                    "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {auth?.user?.email || ""}
                </p>
              </div>
              {!mobile && (
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  title={collapsed ? "Mostrar menú" : "Ocultar menú"}
                  aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
                >
                  {collapsed ? (
                    <ChevronRightIcon className="size-5" aria-hidden="true" />
                  ) : (
                    <ChevronLeftIcon className="size-5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <div>
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>
            <SidebarContent mobile />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div
        className={classNames(
          desktopSidebar.expanded ? "lg:w-72" : "lg:w-20",
          "hidden transition-[width] duration-300 ease-in-out lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col",
        )}
      >
        <SidebarContent collapsed={!desktopSidebar.expanded} />
      </div>

      {/* Main content area with header */}
      <div
        className={classNames(
          desktopSidebar.expanded ? "lg:pl-72" : "lg:pl-20",
          "transition-[padding] duration-300 ease-in-out",
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch justify-end lg:gap-x-6">
            {/* Page Title */}
            <nav
              aria-label="PageTitle"
              className="flex flex-1 lg:hidden items-center"
            >
              <div className="flex-1 items-center space-x-2">
                <span className="text-base font-medium text-gray-600">
                  {breadcrumbs[breadcrumbs.length - 1].name}
                </span>
              </div>
            </nav>
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="items-center flex-1 hidden lg:flex"
            >
              <ol role="list" className="flex items-center space-x-4">
                <li>
                  <div>
                    <Link
                      to="/admin/dashboard"
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <HomeIconSolid
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                      <span className="sr-only">Home</span>
                    </Link>
                  </div>
                </li>
                {breadcrumbs.map((page) => (
                  <li key={page.name}>
                    <div className="flex items-center">
                      <svg
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="size-5 shrink-0 text-gray-300"
                      >
                        <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                      </svg>
                      {page.current ? (
                        <span
                          aria-current="page"
                          className="ml-4 text-sm font-medium text-gray-500"
                        >
                          {page.name}
                        </span>
                      ) : (
                        <Link
                          to={page.href}
                          className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          {page.name}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                type="button"
                className="-m-2.5 hidden p-2.5 text-gray-400 hover:text-gray-500 lg:block"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              {/* Separator */}
              <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
              />

              {/* Profile dropdown */}
              <Menu as="div" className="relative">
                <MenuButton className="relative flex items-center">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  <div
                    translate="no"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold outline -outline-offset-1 outline-black/5"
                  >
                    {getUserInitials()}
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      aria-hidden="true"
                      className="ml-4 text-sm/6 font-semibold text-gray-900"
                    >
                      {auth?.user?.first_name || "User"}
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="ml-2 size-5 text-gray-400"
                    />
                  </span>
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg outline-1 outline-gray-900/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  {userNavigation.map((item) => (
                    <MenuItem key={item.name}>
                      {item.onClick ? (
                        <button
                          onClick={item.onClick}
                          className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                        >
                          {item.name}
                        </button>
                      ) : (
                        <a
                          href={item.href}
                          className={`px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden ${
                            item.mobileHidden ? "hidden lg:block" : "block"
                          }`}
                        >
                          {item.name}
                        </a>
                      )}
                    </MenuItem>
                  ))}
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className=" pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
