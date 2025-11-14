import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { Agent, setGlobalDispatcher } from "undici";
import { autocompleteRoute } from "./routes/autocomplete.js";
import { modelPlaygroundRoute } from "./routes/model-playground/index.js";
import { objectGenerationRoute } from "./routes/objectGeneration.js";
import { proxyRoute } from "./routes/proxy.js";
import { regularRoute } from "./routes/regular.js";
import { serverPromptbuilderRoute } from "./routes/serverPromptbuilder.js";

// make sure our fetch request uses HTTP/2
setGlobalDispatcher(
  new Agent({
    allowH2: true,
  }),
);

const app = new Hono();

app.use("/health", async (c) => {
  return c.json({ status: "ok" });
});

if (process.env.TOKEN?.length) {
  app.use("/ai/*", bearerAuth({ token: process.env.TOKEN }));
} else {
  // eslint-disable-next-line no-console
  console.warn("no token set, ai requests will not be secured");
}

app.use("/ai/*", cors());
app.route("/ai/regular", regularRoute);
app.route("/ai/proxy", proxyRoute);
app.route("/ai/object-generation", objectGenerationRoute);
app.route("/ai/server-promptbuilder", serverPromptbuilderRoute);
app.route("/ai/model-playground", modelPlaygroundRoute);
app.route("/ai/autocomplete", autocompleteRoute);

const http2 = existsSync("localhost.pem");
serve(
  {
    fetch: app.fetch,
    createServer: http2 ? createSecureServer : undefined,

    serverOptions: {
      key: http2 ? readFileSync("localhost-key.pem") : undefined,
      cert: http2 ? readFileSync("localhost.pem") : undefined,
    },
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(
      `Server is running on ${info.address}${info.port}, http2: ${http2}`,
    );
  },
);
