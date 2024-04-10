import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, Link, RouterProvider } from "react-router-dom";

import { FlexColumnAlignCenter } from "./styles/utils";

import AppStyle from "./components/AppStyle";

// Set up react router
// Use HashRouter for GitHub Pages support, so additional paths are routed to
// the base app instead of trying to open pages that don't exist.
const router = createHashRouter([
  {
    path: "/",
    element: (
      <div>
        <FlexColumnAlignCenter style={{ width: "100%", padding: "40px" }}>
          <h1>Coming soon...</h1>
          <p>This page is currently under construction.</p>
          <Link to="https://allencell.org/">Return to Allen Institute for Cell Science</Link>
        </FlexColumnAlignCenter>
      </div>
    ),
    errorElement: (
      <div>
        <FlexColumnAlignCenter style={{ width: "100%", padding: "40px" }}>
          <h1>Coming soon...</h1>
          <p>This page is currently under construction.</p>
          <Link to="https://allencell.org/">Return to Allen Institute for Cell Science</Link>
        </FlexColumnAlignCenter>
      </div>
    ),
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
