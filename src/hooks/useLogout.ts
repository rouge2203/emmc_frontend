import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import useAuth from "./useAuth";

/**
 * Hook to handle user logout
 * Blacklists refresh token on server and clears client state
 */
const useLogout = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      // Call backend to blacklist refresh token
      await axios.post(
        "auth/logout",
        {},
        {
          withCredentials: true, // Send refresh token cookie to be blacklisted
        }
      );
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear auth state and redirect, even if backend call fails
      setAuth(null);
      window.scrollTo(0, 0);
      navigate("/login", { replace: true });
    }
  };

  return logout;
};

export default useLogout;
