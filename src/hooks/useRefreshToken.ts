import { useCallback } from "react";
import axios from "../api/axios";
import useAuth from "./useAuth";

/**
 * Hook to refresh the access token using the refresh token cookie
 * Returns a function that fetches a new access token
 */
const useRefreshToken = () => {
  const { setAuth } = useAuth();

  const refresh = useCallback(async () => {
    try {
      console.log("[useRefreshToken] Calling refresh endpoint");
      const response = await axios.post(
        "auth/refresh",
        {},
        {
          withCredentials: true,
        }
      );

      setAuth((prev) => {
        if (!prev) {
          return {
            access: response.data.access,
            user: response.data.user,
          };
        }
        return {
          ...prev,
          access: response.data.access,
          user: response.data.user,
        };
      });

      console.log("[useRefreshToken] Refresh response received", {
        status: response.status,
        hasAccess: Boolean(response.data?.access),
        hasUser: Boolean(response.data?.user),
      });
      return response.data.access;
    } catch (error) {
      console.error("[useRefreshToken] Refresh failed", error);
      setAuth(null);
      throw error;
    }
  }, [setAuth]);

  return refresh;
};

export default useRefreshToken;
