// Install the DOM before BlockNote is used.
import "./dom.js";

import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { createDocumentStore } from "./documents.js";

const port = Number(process.env.PORT ?? 3010);
const store = createDocumentStore([
  { type: "heading", content: "Welcome" },
  {
    type: "paragraph",
    props: { textColor: "blue" },
    content:
      "Read this document as markdown, HTML or plain text, and write it back.",
  },
]);

serve({ fetch: createApp(store).fetch, port });
// oxlint-disable-next-line no-console
console.log(
  `Text lens server: http://localhost:${port}/documents/demo/markdown`,
);
