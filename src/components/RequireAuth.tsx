import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

interface RequireAuthProps {
  allowedRoles: string[];
}

/**
 * Component to protect routes based on user roles
 * Redirects to unauthorized if user doesn't have required role
 * Redirects to login if user is not authenticated
 */
const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
  const { auth } = useAuth();
  const location = useLocation();

  // Check if user has any of the allowed roles
  const hasRequiredRole =
    auth?.user?.role && allowedRoles.includes(auth.user.role);

  if (!auth?.access) {
    // Not logged in - redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRequiredRole) {
    // Logged in but doesn't have required role - redirect to unauthorized
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // User is authenticated and has required role - render the protected content
  return <Outlet />;
};

export default RequireAuth;
