import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router-dom";

import { getBuildDisplayDateString } from "./colorizer/utils/math_utils";
import { ErrorPage, LandingPage } from "./routes";
import { decodeGitHubPagesUrl, isEncodedPathUrl, tryRemoveHashRouting } from "./utils/gh_routing";

import AppStyle from "./components/AppStyle";
import Viewer from "./Viewer";

// // Decode URL path if it was encoded for GitHub pages or uses hash routing.
// const locationUrl = new URL(window.location.toString());
// if (locationUrl.hash !== "" || isEncodedPathUrl(locationUrl)) {
//   const decodedUrl = tryRemoveHashRouting(decodeGitHubPagesUrl(locationUrl));
//   const newRelativePath = decodedUrl.pathname + decodedUrl.search + decodedUrl.hash;
//   console.log("Redirecting to " + newRelativePath);
//   // Replaces the query string path with the original path now that the
//   // single-page app has loaded. This lets routing work as normal below.
//   window.history.replaceState(null, "", newRelativePath);
// }

const version = import.meta.env.VITE_APP_VERSION;
const basename = import.meta.env.BASE_URL;

console.log(`Timelapse Feature Explorer - Version ${version}`);
console.log(`Timelapse Feature Explorer - Basename ${basename}`);
console.log(`Timelapse Feature Explorer - Last built ${getBuildDisplayDateString()}`);

// Set up react router
const router = createHashRouter(
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
  ]
  // { basename: import.meta.env.BASE_URL }
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
