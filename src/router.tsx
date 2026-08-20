import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import Login from "./pages/Login";
import RequireAuth from "./components/RequireAuth";
import PersistLogin from "./components/PersistLogin";
import SuspenseBoundary from "./components/SuspenseBoundary";

// Route-level code splitting: each portal only downloads its own pages.
const NotFound404 = lazy(() => import("./pages/NotFound404"));
const Other = lazy(() => import("./pages/Other"));
const RecoverPassword = lazy(() => import("./pages/RecoverPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const CreatePassword = lazy(() => import("./pages/CreatePassword"));
const AccessLink = lazy(() => import("./pages/AccessLink"));
const SetPassword = lazy(() => import("./pages/SetPassword"));

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const TeacherLayout = lazy(() => import("./layouts/TeacherLayout"));
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));

const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./pages/dashboards/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/dashboards/StudentDashboard"));

const Teams = lazy(() => import("./pages/admin/Teams"));
const TeamDetail = lazy(() => import("./pages/admin/TeamDetail"));
const Projects = lazy(() => import("./pages/admin/Projects"));
const ProjectDetail = lazy(() => import("./pages/admin/ProjectDetail"));
const Calendar = lazy(() => import("./pages/admin/Calendar"));
const ScheduleAssignment = lazy(() => import("./pages/admin/ScheduleAssignment"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const StudentUsers = lazy(() => import("./pages/admin/StudentUsers"));
const Becados = lazy(() => import("./pages/admin/Becados"));
const InstrumentTypes = lazy(() => import("./pages/admin/InstrumentTypes"));
const Inventario = lazy(() => import("./pages/admin/Inventario"));
const InstrumentLoans = lazy(() => import("./pages/admin/InstrumentLoans"));
const Catedra = lazy(() => import("./pages/admin/Catedra"));
const Courses = lazy(() => import("./pages/admin/Courses"));
const CourseEnrollments = lazy(() => import("./pages/admin/CourseEnrollments"));
const EnrollmentGrades = lazy(() => import("./pages/admin/EnrollmentGrades"));
const Aulas = lazy(() => import("./pages/admin/Aulas"));
const TeacherUsers = lazy(() => import("./pages/admin/TeacherUsers"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const News = lazy(() => import("./pages/admin/News"));

const CourseDashboard = lazy(() => import("./pages/teacher/CourseDashboard"));
const AssignmentDetail = lazy(() => import("./pages/teacher/AssignmentDetail"));
const ResourceDetail = lazy(() => import("./pages/teacher/ResourceDetail"));

const StudentCourseDashboard = lazy(() => import("./pages/students/CourseDashboard"));
const StudentPayments = lazy(() => import("./pages/students/Payments"));
const StudentInstrumentLoans = lazy(() => import("./pages/students/InstrumentLoans"));
const InstrumentsPage = lazy(() => import("./pages/instruments/InstrumentsPage"));

export const router = createBrowserRouter([
  {
    element: <SuspenseBoundary />,
    children: [
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
            path: "/acceso",
            element: <AccessLink />,
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
                    path: "/admin/asignacion-de-horarios",
                    element: <ScheduleAssignment />,
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
                    path: "/admin/becados",
                    element: <Becados />,
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
                    path: "/admin/instrumentos/practica",
                    element: <InstrumentsPage />,
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
                    path: "/admin/enrollment-grades/:enrollmentId",
                    element: <EnrollmentGrades />,
                  },
                  {
                    path: "/admin/aulas",
                    element: <Aulas />,
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
                  {
                    path: "/teacher/instrumentos",
                    element: <InstrumentsPage />,
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
                  {
                    path: "/student/pagos",
                    element: <StudentPayments />,
                  },
                  {
                    path: "/student/alquileres",
                    element: <StudentInstrumentLoans />,
                  },
                  {
                    path: "/student/instrumentos",
                    element: <InstrumentsPage />,
                  },
                ],
              },
            ],
          },

          // Protected route - any authenticated role, standalone step (not
          // inside a portal layout): the optional password-setup page a
          // user lands on right after activating via email login.
          {
            element: (
              <RequireAuth allowedRoles={["admin", "teacher", "student"]} />
            ),
            children: [
              {
                path: "/establecer-contrasena",
                element: <SetPassword />,
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
    ],
  },
]);
