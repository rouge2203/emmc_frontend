import { createBrowserRouter } from "react-router-dom";

import Index from "./pages/Index";
import NotFound404 from "./pages/NotFound404";
import Other from "./pages/Other";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/other",
    element: <Other />,
  },
  {
    path: "*",
    element: <NotFound404 />,
  },
]);
