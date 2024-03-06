import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AppStyle from "./components/AppStyle";
import ErrorPage from "./routes/ErrorPage";
import Viewer from "./Viewer";

// Set up react router

const router = createBrowserRouter([
  {
    path: "/",
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
