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
import AdminLayout from "./layouts/AdminLayout";
import Teams from "./pages/admin/Teams";
import TeamDetail from "./pages/admin/TeamDetail";
import Projects from "./pages/admin/Projects";
import ProjectDetail from "./pages/admin/ProjectDetail";
import Calendar from "./pages/admin/Calendar";
import Documents from "./pages/admin/Documents";
import Reports from "./pages/admin/Reports";
import CreatePassword from "./pages/CreatePassword";

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
        path: "/activar-cuenta",
        element: <CreatePassword />,
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
            element: <AdminLayout />,
            children: [
              {
                path: "/admin/dashboard",
                element: <AdminDashboard />,
              },
              {
                path: "/admin/teams",
                element: <Teams />,
              },
              {
                path: "/admin/teams/:teamName",
                element: <TeamDetail />,
              },
              {
                path: "/admin/projects",
                element: <Projects />,
              },
              {
                path: "/admin/projects/:projectName",
                element: <ProjectDetail />,
              },
              {
                path: "/admin/calendar",
                element: <Calendar />,
              },
              {
                path: "/admin/documents",
                element: <Documents />,
              },
              {
                path: "/admin/reports",
                element: <Reports />,
              },
            ],
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
