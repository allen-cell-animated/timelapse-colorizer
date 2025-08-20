import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { getBuildDisplayDateString } from "./colorizer/utils/math_utils";
import { BASE_URL, INTERNAL_BUILD, VERSION_NUMBER } from "./constants";
import { ErrorPage, LandingPage } from "./routes";
import { decodeGitHubPagesUrl, isEncodedPathUrl, tryRemoveHashRouting } from "./utils/gh_routing";

import AppStyle from "./components/AppStyle";
import Viewer from "./Viewer";

// Decode URL path if it was encoded for GitHub pages or uses hash routing.
const locationUrl = new URL(window.location.toString());
if (locationUrl.hash !== "" || isEncodedPathUrl(locationUrl)) {
  const decodedUrl = tryRemoveHashRouting(decodeGitHubPagesUrl(locationUrl));
  const newRelativePath = decodedUrl.pathname + decodedUrl.search + decodedUrl.hash;
  console.log("Redirecting to " + newRelativePath);
  // Replaces the query string path with the original path now that the
  // single-page app has loaded. This lets routing work as normal below.
  window.history.replaceState(null, "", newRelativePath);
}

console.log(`Timelapse Feature Explorer - Version ${VERSION_NUMBER}`);
console.log(`Timelapse Feature Explorer - Basename ${BASE_URL}`);
console.log(`Timelapse Feature Explorer - Last built ${getBuildDisplayDateString()}`);
INTERNAL_BUILD && console.log("Timelapse Feature Explorer - --INTERNAL BUILD--");

// Set up react router
const router = createBrowserRouter(
  [
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
  ],
  { basename: import.meta.env.BASE_URL }
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
