import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./styles.css";

// Render React component
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
