import React, { useEffect, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { LiaUserTieSolid } from "react-icons/lia";
import AdminInfoDrawer from "../../components/drawers/AdminInfoDrawer";

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile: {
    user: number;
  } | null;
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
  results: AdminUser[];
  pagination: PaginationInfo;
}

const AdminUsers = () => {
  const axiosPrivate = useAxiosPrivate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchUsers = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.post<PaginatedResponse>(
        "users/get-users",
        {
          role: "admin",
          page: pageNum,
          page_size: pageSize,
        }
      );
      setUsers(response.data.results);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al cargar los administradores"
      );
      console.error("Error fetching admin users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [axiosPrivate, page, pageSize]);

  const handleEdit = (user: AdminUser) => {
    setSelectedUserId(user.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUserId(null);
  };

  const handleCreateAdmin = () => {
    console.log("soon");
  };

  // Placeholder image URL (you can replace with your own placeholder)
  const getPlaceholderImage = (name: string) => {
    // Using a placeholder image service
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=155c95&color=fff&size=128`;
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">
              Cargando administradores...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
          <LiaUserTieSolid className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm  text-gray-700">
            Administradores con acceso al panel administrativo no tienen
            restricciones.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex  justify-left">
          <button
            type="button"
            onClick={handleCreateAdmin}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear admin
          </button>
        </div>
      </div>
      <div className="mt-2 sm:mt-4 flow-root ">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8  ">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8  ">
            <div className=" sm:border sm:border-gray-300  sm:rounded-x-md sm:rounded-t-md sm:py-2 sm:px-2">
              <table className="relative min-w-full divide-y divide-gray-300    ">
                <thead className="">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      Nombre
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Rol
                    </th>
                    <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                      <span className="sr-only">Editar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                      >
                        No hay administradores registrados
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const fullName =
                        `${user.first_name || ""} ${
                          user.last_name || ""
                        }`.trim() || "Sin nombre";
                      return (
                        <tr key={user.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="flex items-center">
                              <div className="size-11 shrink-0">
                                <img
                                  alt=""
                                  src={getPlaceholderImage(fullName)}
                                  className="size-11 rounded-full"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">
                                  {fullName}
                                </div>
                                <div className="mt-1 text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                user.is_active
                                  ? "bg-green-50 text-green-700 ring-green-600/20"
                                  : "bg-red-50 text-red-700 ring-red-600/20"
                              }`}
                            >
                              {user.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {user.role || "admin"}
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-gray-900 hover:text-gray-700"
                            >
                              Editar
                              <span className="sr-only">, {fullName}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Pagination Controls */}
      {pagination && pagination.total_pages > 1 && (
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
                  pagination.total_count
                )}
              </span>{" "}
              de <span className="font-medium">{pagination.total_count}</span>{" "}
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

      {/* Admin Info Drawer */}
      <AdminInfoDrawer
        userId={selectedUserId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

export default AdminUsers;
