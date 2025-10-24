import { useContext, useDebugValue } from "react";
import AuthContext from "../context/AuthProvider";

/**
 * Hook to access authentication context
 * Throws error if used outside AuthProvider
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  // Add debug value for React DevTools
  useDebugValue(context.auth, (auth) =>
    auth?.user ? "Logged In" : "Logged Out"
  );

  return context;
};

export default useAuth;
