import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { Agent, setGlobalDispatcher } from "undici";
import { proxyRoute } from "./routes/proxy.js";
import { vercelAiSdkRoute } from "./routes/vercelAiSdk.js";
import { vercelAiSdkPersistenceRoute } from "./routes/vercelAiSdkPersistence.js";

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
app.route("/ai/proxy", proxyRoute);
app.route("/ai/vercel-ai-sdk", vercelAiSdkRoute);
app.route("/ai/vercel-ai-sdk-persistence", vercelAiSdkPersistenceRoute);

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
