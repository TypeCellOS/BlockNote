import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

window.React = React;
window.ReactDOM = ReactDOM;
addEventListener('paste', (event) => {
  console.log(event.clipboardData.getData("text/html"));
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
