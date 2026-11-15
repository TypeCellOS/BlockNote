import fetch, { AbortError, FetchError } from "node-fetch";
import { Readable } from "node:stream";
import { useAgent } from "request-filtering-agent";

function expectedTransportFailure(error: unknown): boolean {
  return (
    error instanceof FetchError ||
    error instanceof AbortError ||
    (error instanceof Error &&
      "code" in error &&
      (error.code === "ECONNRESET" ||
        error.code === "ERR_STREAM_PREMATURE_CLOSE" ||
        error.code === "Z_DATA_ERROR" ||
        error.code === "Z_BUF_ERROR"))
  );
}

/** Node-only dev transport: filtering happens in the actual socket DNS lookup. */
export async function protectedFetch(request: Request): Promise<Response> {
  try {
    const upstream = await fetch(request.url, {
      method: "GET",
      headers: { Accept: request.headers.get("accept") ?? "text/html" },
      redirect: "manual",
      signal: request.signal,
      agent: useAgent(request.url),
    });
    const headers = new Headers();
    for (const name of ["content-type", "location"]) {
      const value = upstream.headers.get(name);
      if (value !== null) {
        headers.set(name, value);
      }
    }
    const noBody = [204, 205, 304, 301, 302, 303, 307, 308].includes(
      upstream.status,
    );
    if (noBody && upstream.body instanceof Readable) {
      upstream.body.destroy();
    }
    if (upstream.body && !(upstream.body instanceof Readable)) {
      throw new Error("Expected a Node readable response body.");
    }
    // Stream decoded bytes with backpressure. Portable server code owns its
    // head/JSON byte limits and may cancel after headers or a small HTML head.
    const body =
      !noBody && upstream.body instanceof Readable
        ? streamBody(upstream.body)
        : null;
    return new Response(body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    if (expectedTransportFailure(error)) {
      // Adapt node-fetch's expected transport failures to Fetch semantics.
      throw new TypeError("Protected development fetch failed.", {
        cause: error,
      });
    }
    throw error;
  }
}

function streamBody(body: Readable): ReadableStream<Uint8Array> {
  const iterator: AsyncIterator<unknown> = body[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) {
            controller.close();
          } else if (next.value instanceof Uint8Array) {
            controller.enqueue(next.value);
          } else {
            throw new Error("Expected decoded byte chunks.");
          }
        } catch (error) {
          controller.error(
            expectedTransportFailure(error)
              ? new TypeError("Protected development response failed.", {
                  cause: error,
                })
              : error,
          );
        }
      },
      cancel() {
        body.destroy();
      },
    },
    { highWaterMark: 0 },
  );
}
