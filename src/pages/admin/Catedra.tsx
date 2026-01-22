import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisHorizontalIcon } from "@heroicons/react/20/solid";
import { MdLibraryMusic } from "react-icons/md";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import CareerInfoDrawer from "../../components/drawers/CareerInfoDrawer";
import CareerCreateDrawer from "../../components/drawers/CareerCreateDrawer";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { IoMdBook } from "react-icons/io";
import { MdOutlineSchool } from "react-icons/md";

interface Career {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  created_by: { id: number; first_name: string; last_name: string } | null;
  created_at: string | null;
  updated_by: { id: number; first_name: string; last_name: string } | null;
  updated_at: string | null;
  courses_count: number;
}

interface CareersResponse {
  careers: Career[];
}

const Catedra = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [careers, setCareers] = useState<Career[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCareerId, setSelectedCareerId] = useState<number | null>(null);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const fetchCareers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<CareersResponse>(
        "courses/manage-careers"
      );
      setCareers(response.data.careers);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar las carreras");
      console.error("Error fetching careers:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchCareers();
  }, [axiosPrivate]);

  const handleEdit = (career: Career) => {
    setSelectedCareerId(career.id);
    setIsInfoDrawerOpen(true);
  };

  const handleCloseInfoDrawer = () => {
    setIsInfoDrawerOpen(false);
    setSelectedCareerId(null);
  };

  const handleCardClick = (career: Career) => {
    setSelectedCareerId(career.id);
    setIsInfoDrawerOpen(true);
  };

  const handleCreateCareer = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleCareerCreated = (newCareer: Career) => {
    setCareers((prevCareers) => [...prevCareers, newCareer]);
  };

  const handleCareerUpdated = (updatedCareer: Career) => {
    setCareers((prevCareers) =>
      prevCareers.map((career) =>
        career.id === updatedCareer.id ? updatedCareer : career
      )
    );
  };

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
          <HiOutlineBuildingLibrary className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Carreras registradas en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left">
          <button
            type="button"
            onClick={handleCreateCareer}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear carrera
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Cargando carreras...</p>
            </div>
          </div>
        </div>
      )}
      {!isLoading && (
        <div className="mt-8">
          {careers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">
                No se encontraron carreras
              </p>
            </div>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8"
            >
              {careers.map((career) => (
                <li
                  key={career.id}
                  className="overflow-hidden rounded-xl outline outline-gray-200 hover:cursor-pointer hover:outline-gray-300 transition-all flex flex-col"
                  onClick={() => handleCardClick(career)}
                >
                  <div className="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6 h-24">
                    {career.image_url ? (
                      <img
                        alt={career.name}
                        src={career.image_url}
                        className="size-12 flex-none rounded-lg bg-white object-cover ring-1 ring-gray-900/10"
                      />
                    ) : (
                      <div className="size-12 flex-none rounded-lg bg-white object-cover ring-1 ring-gray-900/10 flex items-center justify-center">
                        <MdLibraryMusic className="size-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-sm/6 font-medium text-gray-900">
                        {career.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {career.description || "Sin descripción"}
                      </div>
                    </div>
                    <Menu as="div" className="relative">
                      <MenuButton
                        className="relative block text-gray-400 hover:text-gray-500"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <span className="absolute -inset-2.5" />
                        <span className="sr-only">Open options</span>
                        <EllipsisHorizontalIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </MenuButton>
                      <MenuItems
                        transition
                        className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg outline-1 outline-gray-900/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                      >
                        <MenuItem>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(career);
                            }}
                            className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden"
                          >
                            Editar
                            <span className="sr-only">, {career.name}</span>
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                  <dl className="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
                    <div className="flex justify-between gap-x-4 py-3">
                      <dt className="text-gray-500">Cursos</dt>
                      <dd className="flex items-start gap-x-2">
                        <div className="font-medium text-gray-900">
                          {career.courses_count || 0}
                        </div>
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-gray-100 px-6 py-4">
                    <div className="flex gap-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/cursos?career_id=${career.id}`);
                        }}
                        className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <IoMdBook className="size-5" />
                        Cursos
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Placeholder for now
                        }}
                        className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <MdOutlineSchool className="size-5" />
                        Estudiantes
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Info/Edit Drawer */}
      <CareerInfoDrawer
        careerId={selectedCareerId}
        isOpen={isInfoDrawerOpen}
        onClose={handleCloseInfoDrawer}
        onCareerUpdated={handleCareerUpdated}
      />

      {/* Create Drawer */}
      <CareerCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onCareerCreated={handleCareerCreated}
      />
    </div>
  );
};

export default Catedra;
