import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { Agent, setGlobalDispatcher } from "undici";

// make sure our fetch request uses HTTP/2
setGlobalDispatcher(
  new Agent({
    allowH2: true,
  })
);

const ignoreHeadersRe = /^content-(?:encoding|length|range)$/i;

export const proxyFetch: typeof fetch = async (request, options) => {
  const req = new Request(request, options);
  req.headers.delete("accept-encoding"); // TBD: there may be cases where you want to explicitly specify
  const res = await fetch(req);

  const headers: HeadersInit = [...res.headers.entries()].filter(
    ([k]) => !ignoreHeadersRe.test(k) && k !== "strict-transport-security"
  );
  return new Response(res.body, {
    ...res,
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

function getProviderInfo(provider: string) {
  if (provider === "openai") {
    return {
      key: process.env.OPENAI_API_KEY,
    };
  }
  if (provider === "groq") {
    return {
      key: process.env.GROQ_API_KEY,
    };
  }
  if (provider === "albert-etalab") {
    return {
      key: process.env.ALBERT_ETALAB_API_KEY,
    };
  }
  return "not-found";
}

const app = new Hono();

app.use("/health", async (c) => {
  return c.json({ status: "ok" });
});

app.use("/ai", cors(), async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.json({ error: "url parameter is required" }, 400);
  }

  const provider = c.req.query("provider");
  if (!provider) {
    return c.json({ error: "provider parameter is required" }, 400);
  }

  const providerInfo = getProviderInfo(provider);

  if (providerInfo === "not-found" || !providerInfo.key?.length) {
    return c.json(
      {
        error: `provider / key not found for provider ${provider}. Make sure to load correct env variables.`,
      },
      404
    );
  }

  // eslint-disable-next-line no-console
  console.log("Proxying request to", url);
  const request = new Request(url, c.req.raw);
  request.headers.set("Authorization", `Bearer ${providerInfo.key}`);
  return proxyFetch(request);
});

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
      `Server is running on ${info.address}${info.port}, http2: ${http2}`
    );
  }
);
