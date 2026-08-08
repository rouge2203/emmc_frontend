import { Suspense } from "react";
import { Outlet } from "react-router-dom";

// Shared fallback for the route-level code splitting in router.tsx.
export default function SuspenseBoundary() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
