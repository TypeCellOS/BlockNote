import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { existsSync, readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { Agent, setGlobalDispatcher } from "undici";

// make sure our fetch request uses HTTP/2
setGlobalDispatcher(
  new Agent({
    allowH2: true,
  }),
);

const ignoreHeadersRe = /^content-(?:encoding|length|range)$/i;

// REC: we might be able to replace this by https://github.com/honojs/hono/pull/3589
export const proxyFetch: typeof fetch = async (request, options) => {
  const req = new Request(request, options);
  req.headers.delete("accept-encoding"); // TBD: there may be cases where you want to explicitly specify
  req.headers.delete("Origin");
  const res = await fetch(req);

  const headers: HeadersInit = [...res.headers.entries()].filter(
    ([k]) => !ignoreHeadersRe.test(k) && k !== "strict-transport-security",
  );

  const readable = res.body;

  // For debugging purposes, we can log the chunks as they stream:

  // const { readable, writable } = new TransformStream({
  //   async transform(chunk, controller) {
  //     // Log each chunk as it passes through

  //     // optional, wait to test streaming mode
  //     // await new Promise((resolve) => setTimeout(resolve, 3000));

  //     console.log("Streaming chunk:", new TextDecoder().decode(chunk));
  //     controller.enqueue(chunk);
  //   },
  // });

  // // Pipe the response body through our transform stream
  // res.body?.pipeTo(writable).catch((err) => {
  //   console.error("Error in stream:", err);
  // });

  return new Response(readable, {
    ...res,
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

function getProviderInfo(provider: string) {
  const envKey = `${provider.toUpperCase().replace(/-/g, "_")}_API_KEY`;
  const key = process.env[envKey];
  if (!key || !key.length) {
    return "not-found";
  }
  if (provider === "google") {
    return {
      key,
      header: "x-goog-api-key",
    };
  }
  if (provider === "anthropic") {
    return {
      key,
      header: "x-api-key",
    };
  }

  return {
    key,
    header: "Authorization",
  };
}

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

  if (providerInfo === "not-found") {
    return c.json(
      {
        error: `provider / key not found for provider ${provider}. Make sure to load correct env variables.`,
      },
      404,
    );
  }

  // eslint-disable-next-line no-console
  console.log("Proxying request to", url);
  const request = new Request(url, c.req.raw);
  if (providerInfo.header === "Authorization") {
    request.headers.set("Authorization", `Bearer ${providerInfo.key}`);
  } else {
    request.headers.set(providerInfo.header, `${providerInfo.key}`);
  }

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
      `Server is running on ${info.address}${info.port}, http2: ${http2}`,
    );
  },
);
