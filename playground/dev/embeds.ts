import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite-plus";

const endpoint = "/__embeds/oembed";
const loopbackAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** This is a local playground tool, not a publicly exposed URL-fetch service. */
export function localRequestUrl(request: {
  headers: IncomingMessage["headers"];
  socket: Pick<IncomingMessage["socket"], "remoteAddress" | "localPort">;
  url?: string;
}): URL | undefined {
  if (
    !loopbackAddresses.has(request.socket.remoteAddress ?? "") ||
    request.headers["sec-fetch-site"] !== "same-origin" ||
    !request.headers.host ||
    !request.headers.referer
  ) {
    return undefined;
  }
  try {
    const origin = new URL(`http://${request.headers.host}`);
    if (
      !localHosts.has(origin.hostname) ||
      origin.host !== request.headers.host ||
      Number(origin.port || 80) !== request.socket.localPort ||
      new URL(request.headers.referer).origin !== origin.origin ||
      (request.headers.origin !== undefined &&
        request.headers.origin !== origin.origin)
    ) {
      return undefined;
    }
    return new URL(request.url ?? "/", origin);
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
}

export function embedDemo(): Plugin {
  return {
    name: "blocknote-local-embed-demo",
    apply: "serve",
    config() {
      return {
        define: {
          "import.meta.env.BLOCKNOTE_EMBED_DEMO_ENDPOINT":
            JSON.stringify(endpoint),
        },
      };
    },
    async configureServer(server) {
      // Loaded only for development; no Node transport enters the shipped server
      // package, client bundle, production build, or Vite preview server.
      const [{ createEmbedResolver }, { protectedFetch }] = await Promise.all([
        import("@blocknote/xl-embed-server"),
        import("./protectedFetch.js"),
      ]);
      const resolver = createEmbedResolver({ protectedFetch });
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?", 1)[0] !== endpoint) {
          next();
          return;
        }
        const url = localRequestUrl(request);
        if (!url) {
          response.writeHead(403, { "Content-Type": "text/plain" });
          response.end(
            "The embed demo requires a same-origin browser request on localhost.",
          );
          return;
        }
        if (request.method !== "GET") {
          response.writeHead(405, { Allow: "GET" });
          response.end();
          return;
        }
        const controller = new AbortController();
        function close() {
          // IncomingMessage.close also fires for a normally completed GET.
          // Only premature closure of our response means the client left.
          if (!response.writableEnded) {
            controller.abort();
          }
        }
        response.once("close", close);
        if (response.destroyed) {
          close();
        }
        // Construct a fresh request: browser cookies/auth never reach providers.
        void resolver
          .fetch(new Request(url, { signal: controller.signal }))
          .then(async (result) => {
            if (controller.signal.aborted || response.destroyed) {
              return;
            }
            const text = await result.text();
            if (controller.signal.aborted || response.destroyed) {
              return;
            }
            response.writeHead(result.status, {
              "Content-Type":
                result.headers.get("content-type") ?? "text/plain",
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            });
            response.end(text);
          })
          .catch((error) => {
            // A disconnect does not make unrelated failures expected.
            if (
              !controller.signal.aborted ||
              error !== controller.signal.reason
            ) {
              next(error);
            }
          })
          .finally(() => response.removeListener("close", close));
      });
    },
  };
}
