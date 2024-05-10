import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ErrorPage, LandingPage } from "./routes";
import { decodeUrlAndRemoveHashRouting, isEncodedPathUrl } from "./utils/gh_routing";

import AppStyle from "./components/AppStyle";
import Viewer from "./Viewer";

const locationUrl = new URL(window.location.toString());
if (locationUrl.hash !== "" || isEncodedPathUrl(locationUrl)) {
  const url = decodeUrlAndRemoveHashRouting(locationUrl);
  const newRelativePath = url.pathname + url.search + url.hash;
  console.log("Redirecting to " + newRelativePath);
  // Replaces the query string path with the original path now that the
  // single-page app has loaded. This lets routing work as normal below.
  window.history.replaceState(null, "", newRelativePath);
}

// Set up react router
const router = createBrowserRouter([
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
