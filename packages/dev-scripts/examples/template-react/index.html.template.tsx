import React from "react";
import type { Project } from "../util";

const template = (project: Project) => (
  <html lang="en">
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: "<!-- AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY -->",
        }}></script>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{project.title}</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="./main.tsx"></script>
    </body>
  </html>
);

export default template;
