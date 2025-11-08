import { useState } from "react";
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
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { HomeIcon as HomeIconSolid } from "@heroicons/react/20/solid";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { LiaUserTieSolid } from "react-icons/lia";

import useAuth from "../hooks/useAuth";
import useLogout from "../hooks/useLogout";

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
        href: "/admin/teams/Human%20Resources",
        icon: LiaChalkboardTeacherSolid,
      },
      {
        name: "Estudiantes",
        href: "/admin/estudiantes",
        icon: PiStudent,
      },
    ],
  },
  {
    name: "Projects",
    icon: FolderIcon,
    current: false,
    children: [
      {
        name: "GraphQL API",
        href: "/admin/projects/GraphQL%20API",
        icon: FolderIcon,
      },
      { name: "iOS App", href: "/admin/projects/iOS%20App", icon: FolderIcon },
      {
        name: "Android App",
        href: "/admin/projects/Android%20App",
        icon: FolderIcon,
      },
      {
        name: "New Customer Portal",
        href: "/admin/projects/New%20Customer%20Portal",
        icon: FolderIcon,
      },
    ],
  },
  {
    name: "Calendar",
    href: "/admin/calendar",
    icon: CalendarIcon,
    current: false,
  },
  {
    name: "Documents",
    href: "/admin/documents",
    icon: DocumentDuplicateIcon,
    current: false,
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: ChartPieIcon,
    current: false,
  },
];

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { auth } = useAuth();
  const logout = useLogout();

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
      documents: "Documents",
      reports: "Reports",
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
        breadcrumbs.push({
          name: mainName,
          href: `/admin/${mainRoute}`,
          current: false,
        });
        const detailName = decodeURIComponent(segments[2]);
        breadcrumbs.push({ name: detailName, href: path, current: true });
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
    { name: "Your profile", href: "#" },
    { name: "Sign out", onClick: logout },
  ];

  const renderNavigationItem = (item: (typeof navigation)[0]) => {
    if (!item.children) {
      return (
        <li key={item.name}>
          <Link
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={classNames(
              item.current
                ? "bg-gray-50 text-primary"
                : "text-gray-600 hover:bg-gray-50 hover:text-primary",
              "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
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
            {item.name}
          </Link>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Disclosure as="div" defaultOpen={item.name === "Usuarios"}>
          <DisclosureButton
            className={classNames(
              item.current ? "bg-gray-50 text-primary" : "hover:bg-gray-50",
              "group  flex w-full items-center gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold text-gray-700 hover:text-primary"
            )}
          >
            <ChevronRightIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-gray-400 group-data-[open]:rotate-90 group-data-[open]:text-gray-500 transition-transform"
            />
            {item.icon && (
              <item.icon
                aria-hidden="true"
                className={classNames(
                  item.current
                    ? "text-primary group-data-[open]:text-gray-600"
                    : "text-gray-600 group-hover:text-primary",
                  "size-6 shrink-0"
                )}
              />
            )}
            <div
              className={classNames(
                item.current ? "group-data-[open]:text-gray-600" : ""
              )}
            >
              {item.name}
            </div>
          </DisclosureButton>
          <DisclosurePanel as="ul" className="mt-1 px-2">
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

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
      <div className="flex h-16 shrink-0 items-center">
        <img
          alt="EMMC Logo"
          src="/emmc_logo.png"
          className="h-16 mt-6 w-auto"
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigationWithCurrent.map((item) => renderNavigationItem(item))}
            </ul>
          </li>
          <li className="-mx-6 mt-auto">
            <div className="flex items-center gap-x-4 px-6 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm/6 font-semibold text-gray-900 truncate">
                  {auth?.user?.first_name + " " + auth?.user?.last_name ||
                    "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {auth?.user?.email || ""}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-2 text-sm text-gray-500 hover:text-gray-700"
                title="Logout"
              >
                <XMarkIcon className="size-5" />
              </button>
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
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
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
            <SidebarContent />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Main content area with header */}
      <div className="lg:pl-72">
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
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
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
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold outline -outline-offset-1 outline-black/5">
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
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg outline-1 outline-gray-900/5 transition data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in"
                >
                  {userNavigation.map((item) => (
                    <MenuItem key={item.name}>
                      {item.onClick ? (
                        <button
                          onClick={item.onClick}
                          className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-hidden"
                        >
                          {item.name}
                        </button>
                      ) : (
                        <a
                          href={item.href}
                          className="block px-3 py-1 text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-hidden"
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
