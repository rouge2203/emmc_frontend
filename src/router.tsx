import { createBrowserRouter } from "react-router-dom";

import Index from "./pages/Index";
import NotFound404 from "./pages/NotFound404";
import Other from "./pages/Other";
import Login from "./pages/Login";
import RecoverPassword from "./pages/RecoverPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import RequireAuth from "./components/RequireAuth";
import PersistLogin from "./components/PersistLogin";

export const router = createBrowserRouter([
  {
    element: <PersistLogin />,
    children: [
      // Public routes
      {
        path: "/",
        element: <Index />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/recuperar-contrasena",
        element: <RecoverPassword />,
      },
      {
        path: "/restablecer-contrasena",
        element: <ResetPassword />,
      },
      {
        path: "/unauthorized",
        element: <Unauthorized />,
      },
      {
        path: "/other",
        element: <Other />,
      },

      // Protected routes - Admin only
      {
        element: <RequireAuth allowedRoles={["admin"]} />,
        children: [
          {
            path: "/admin/dashboard",
            element: <AdminDashboard />,
          },
        ],
      },

      // Protected routes - Teacher only
      {
        element: <RequireAuth allowedRoles={["teacher"]} />,
        children: [
          {
            path: "/teacher/dashboard",
            element: <TeacherDashboard />,
          },
        ],
      },

      // Protected routes - Student only
      {
        element: <RequireAuth allowedRoles={["student"]} />,
        children: [
          {
            path: "/student/dashboard",
            element: <StudentDashboard />,
          },
        ],
      },

      // 404 catch all
      {
        path: "*",
        element: <NotFound404 />,
      },
    ],
  },
]);
