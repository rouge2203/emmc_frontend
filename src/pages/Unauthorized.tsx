import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();

  const goBack = () => navigate(-1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You do not have permission to access this page.
          </p>
          {auth?.user && (
            <p className="mt-4 text-xs text-gray-500">
              Current role:{" "}
              <span className="font-semibold">{auth.user.role || "None"}</span>
            </p>
          )}
          <div className="mt-6 space-y-3">
            <button
              onClick={goBack}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
