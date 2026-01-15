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
import TeacherLayout from "./layouts/TeacherLayout";
import StudentLayout from "./layouts/StudentLayout";
import Teams from "./pages/admin/Teams";
import TeamDetail from "./pages/admin/TeamDetail";
import Projects from "./pages/admin/Projects";
import ProjectDetail from "./pages/admin/ProjectDetail";
import Calendar from "./pages/admin/Calendar";
import Documents from "./pages/admin/Documents";
import Reports from "./pages/admin/Reports";
import CreatePassword from "./pages/CreatePassword";
import AdminUsers from "./pages/admin/AdminUsers";
import StudentUsers from "./pages/admin/StudentUsers";
import InstrumentTypes from "./pages/admin/InstrumentTypes";
import Inventario from "./pages/admin/Inventario";
import InstrumentLoans from "./pages/admin/InstrumentLoans";
import Catedra from "./pages/admin/Catedra";
import Courses from "./pages/admin/Courses";
import CourseEnrollments from "./pages/admin/CourseEnrollments";
import TeacherUsers from "./pages/admin/TeacherUsers";
import Payments from "./pages/admin/Payments";
import News from "./pages/admin/News";
import CourseDashboard from "./pages/teacher/CourseDashboard";
import AssignmentDetail from "./pages/teacher/AssignmentDetail";
import ResourceDetail from "./pages/teacher/ResourceDetail";
import StudentCourseDashboard from "./pages/students/CourseDashboard";

export const router = createBrowserRouter([
  {
    element: <PersistLogin />,
    children: [
      // Public routes
      {
        path: "/",
        element: <Login />,
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
                path: "/admin/calendario-de-cursos",
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
              // New routes
              {
                path: "/admin/administradores",
                element: <AdminUsers />,
              },
              {
                path: "/admin/profesores",
                element: <TeacherUsers />,
              },
              {
                path: "/admin/estudiantes",
                element: <StudentUsers />,
              },
              {
                path: "/admin/instrumentos/registro",
                element: <InstrumentTypes />,
              },
              {
                path: "/admin/instrumentos/inventario",
                element: <Inventario />,
              },
              {
                path: "/admin/instrumentos/alquileres",
                element: <InstrumentLoans />,
              },
              {
                path: "/admin/catedra",
                element: <Catedra />,
              },
              {
                path: "/admin/cursos",
                element: <Courses />,
              },
              {
                path: "/admin/cursos-matriculados",
                element: <CourseEnrollments />,
              },
              {
                path: "/admin/centro-de-pagos",
                element: <Payments />,
              },
              {
                path: "/admin/news",
                element: <News />,
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
            element: <TeacherLayout />,
            children: [
              {
                path: "/teacher/dashboard",
                element: <TeacherDashboard />,
              },
              {
                path: "/teacher/course/:enrollmentId",
                element: <CourseDashboard />,
              },
              {
                path: "/teacher/assignment/:assignmentId",
                element: <AssignmentDetail />,
              },
              {
                path: "/teacher/resource/:resourceId",
                element: <ResourceDetail />,
              },
            ],
          },
        ],
      },

      // Protected routes - Student only
      {
        element: <RequireAuth allowedRoles={["student"]} />,
        children: [
          {
            element: <StudentLayout />,
            children: [
              {
                path: "/student/dashboard",
                element: <StudentDashboard />,
              },
              {
                path: "/student/course/:enrollmentId",
                element: <StudentCourseDashboard />,
              },
            ],
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
