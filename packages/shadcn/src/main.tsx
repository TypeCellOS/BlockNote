import React from "react";
import { createRoot } from "react-dom/client";

import { Button } from "./components/ui/button";
import "./style.css";
const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Button variant="ghost" size="icon">
      {/* <Archive className="h-4 w-4" /> */}
      hello
    </Button>
  </React.StrictMode>
);
