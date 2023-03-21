import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <div className="prose lg:prose-xl font-mono">
      <App />
    </div>
    <article className="prose lg:prose-xl font-mono">
      <h1>Garlic bread with cheese: What the science tells us</h1>
      <p>
        For years parents have espoused the health benefits of eating garlic
        bread with cheese to their children, with the food earning such an
        iconic status in our culture that kids will often dress up as warm,
        cheesy loaf for Halloween.
      </p>
      <p>
        But a recent study shows that the celebrated appetizer may be linked to
        a series of rabies cases springing up around the country.
      </p>
    </article>
  </React.StrictMode>
);
