import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { PiMusicNoteSimpleFill } from "react-icons/pi";
import InstrumentTypeCreateDrawer from "../../components/drawers/InstrumentTypeCreateDrawer";
import InstrumentTypeEditDrawer from "../../components/drawers/InstrumentTypeEditDrawer";

interface InstrumentType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface InstrumentTypesResponse {
  instrument_types: InstrumentType[];
}

const InstrumentTypes = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstrumentTypeId, setSelectedInstrumentTypeId] = useState<
    number | null
  >(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const fetchInstrumentTypes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<InstrumentTypesResponse>(
        "instruments/manage-instruments-types"
      );
      setInstrumentTypes(response.data.instrument_types);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar los tipos de instrumentos"
      );
      console.error("Error fetching instrument types:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchInstrumentTypes();
  }, [axiosPrivate]);

  const handleEdit = (instrumentType: InstrumentType) => {
    setSelectedInstrumentTypeId(instrumentType.id);
    setIsEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedInstrumentTypeId(null);
  };

  const handleCreateInstrumentType = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleInstrumentTypeCreated = (newInstrumentType: InstrumentType) => {
    setInstrumentTypes((prevTypes) => [...prevTypes, newInstrumentType]);
  };

  const handleInstrumentTypeUpdated = (
    updatedInstrumentType: InstrumentType
  ) => {
    setInstrumentTypes((prevTypes) =>
      prevTypes.map((type) =>
        type.id === updatedInstrumentType.id ? updatedInstrumentType : type
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
          <PiMusicNoteSimpleFill className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Tipos de instrumentos disponibles en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left">
          <button
            type="button"
            onClick={handleCreateInstrumentType}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear tipo instrumento
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">
                Cargando tipos de instrumentos...
              </p>
            </div>
          </div>
        </div>
      )}
      {!isLoading && (
        <div className="mt-8">
          {instrumentTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">
                No se encontraron tipos de instrumentos
              </p>
            </div>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {instrumentTypes.map((instrumentType) => (
                <li
                  key={instrumentType.id}
                  className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow-sm relative"
                >
                  <div className="flex w-full items-center justify-between space-x-6 p-6">
                    <div className="flex-1 truncate">
                      <div className="flex items-center space-x-3">
                        <h3
                          onClick={() => handleEdit(instrumentType)}
                          className="truncate text-sm font-medium text-gray-900 hover:cursor-pointer hover:underline"
                        >
                          {instrumentType.name}
                        </h3>
                      </div>
                      <p
                        onClick={() => handleEdit(instrumentType)}
                        className="mt-1 truncate text-sm text-gray-500 hover:cursor-pointer hover:underline"
                      >
                        {instrumentType.description || "Sin descripción"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEdit(instrumentType)}
                      className="shrink-0 hover:opacity-75 transition-opacity hover:cursor-pointer"
                      title="Editar tipo de instrumento"
                    >
                      <PiMusicNoteSimpleFill className="size-10 text-gray-400" />
                    </button>
                  </div>
                  <div>
                    <div className="-mt-px flex divide-x divide-gray-200">
                      <div className="flex w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/instrumentos/inventario?action=create&instrument_type_id=${instrumentType.id}`
                            )
                          }
                          className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Registrar unidad
                        </button>
                      </div>
                      <div className="-ml-px flex w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/instrumentos/inventario?action=view&instrument_type_id=${instrumentType.id}`
                            )
                          }
                          className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Ver unidades
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Create Drawer */}
      <InstrumentTypeCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onInstrumentTypeCreated={handleInstrumentTypeCreated}
      />

      {/* Edit Drawer */}
      <InstrumentTypeEditDrawer
        instrumentTypeId={selectedInstrumentTypeId}
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        onInstrumentTypeUpdated={handleInstrumentTypeUpdated}
      />
    </div>
  );
};

export default InstrumentTypes;
