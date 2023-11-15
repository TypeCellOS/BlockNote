import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <>
      <App />

      <div
        id="portal"
        style={{ position: "fixed", left: 0, top: 0, zIndex: 9999 }}
      />
    </>
  </React.StrictMode>
);
