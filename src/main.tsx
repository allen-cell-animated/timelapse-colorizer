import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";

import { ErrorPage, LandingPage } from "./routes";

import AppStyle from "./components/AppStyle";
import Viewer from "./Viewer";

const basename = import.meta.env.BASE_URL;
console.log(`nucmorph-colorizer Version ${APP_VERSION}`);
console.log(`nucmorph-colorizer Basename ${basename}`);

// Set up react router
// Use HashRouter for GitHub Pages support, so additional paths are routed to
// the base app instead of trying to open pages that don't exist.
const router = createHashRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "viewer",
    element: <Viewer />,
    errorElement: <ErrorPage />,
  },
]);

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
