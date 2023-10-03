import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
