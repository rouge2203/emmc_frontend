import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * What a user sees when a route throws.
 *
 * Without this, react-router falls back to its own error screen — which ships
 * its developer copy ("Hey developer 👋 … provide your own ErrorBoundary") in
 * the production bundle, so teachers were reading a raw stack trace.
 *
 * The common cause here is a browser translation extension rewriting the DOM
 * under React (see `translate="no"` in index.html); the API call has already
 * gone through by then, which is why the copy says the change was saved.
 */
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error ?? "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
            <ExclamationTriangleIcon
              aria-hidden="true"
              className="h-6 w-6 text-amber-600"
            />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            No se pudo mostrar esta página
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Si acabas de guardar una nota, el cambio sí quedó guardado. Recarga
            la página para continuar.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Si el navegador está traduciendo la página, desactiva la traducción
            para este sitio: es lo que suele causar este error.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Recargar página
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Ir al inicio
            </button>
          </div>

          {detail && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                Detalle técnico
              </summary>
              <p
                translate="no"
                className="mt-2 break-words rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-500"
              >
                {detail}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
