import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(
  // TODO: StrictMode is causing duplicate mounts and conflicts with collaboration
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
