import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";

import AppStyle from "./components/AppStyle";
import ErrorPage from "./routes/ErrorPage";
import Viewer from "./Viewer";

// Set up react router
// Use HashRouter for GitHub Pages support, so additional paths are routed to
// the base app instead of trying to open pages that don't exist.
const router = createHashRouter(
  [
    {
      path: "/",
      element: <Viewer />,
      errorElement: <ErrorPage />,
    },
    {
      path: "*",
      element: <ErrorPage />,
    },
  ],
  {
    // Base path is the --base option passed to vite. This ensures that builds
    // work correctly when deployed to subpages.
    basename: import.meta.env.BASE_URL,
  }
);

// Render React component
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <AppStyle>
      <RouterProvider router={router} />
    </AppStyle>
  </React.StrictMode>
);
