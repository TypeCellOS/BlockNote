import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

window.React = React;
window.ReactDOM = ReactDOM;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
