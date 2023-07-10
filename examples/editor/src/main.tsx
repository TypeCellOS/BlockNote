import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// root.render(<App />);
