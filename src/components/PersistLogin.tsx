import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useRefreshToken from "../hooks/useRefreshToken";
import useAuth from "../hooks/useAuth";
import useLocalStorage from "../hooks/useLocalStorage";

/**
 * Component to handle persistent login across page reloads
 * Uses localStorage to remember if user wants to stay logged in
 * Automatically refreshes token on app mount if persist is enabled
 */
const PersistLogin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const refresh = useRefreshToken();
  const { auth } = useAuth();
  const [persist, setPersist] = useLocalStorage("persist", true);

  useEffect(() => {
    let isMounted = true;

    const verifyRefreshToken = async () => {
      try {
        await refresh();
        console.info("[PersistLogin] Access token refreshed");
      } catch (error) {
        console.error("[PersistLogin] Failed to refresh token:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Ensure persist flag is enabled after legacy values
    if (!persist) {
      setPersist(true);
      return () => {
        isMounted = false;
      };
    }

    // Only verify refresh token if:
    // 1. User wants to persist login (persist = true)
    // 2. User is not already authenticated
    if (!auth?.access && persist) {
      verifyRefreshToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [auth?.access, persist, refresh, setPersist]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default PersistLogin;
