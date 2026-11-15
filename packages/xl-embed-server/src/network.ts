import { parseHttpUrl } from "./url.js";
import type { EmbedResolverOptions } from "./types.js";
import { createHeadCollector, type HtmlHead } from "./htmlHead.js";

type Body = { kind: "json"; text: string } | { kind: "html"; head: HtmlHead };

function isTransportFailure(error: unknown, signal: AbortSignal): boolean {
  return (
    error instanceof TypeError ||
    (signal.aborted && error === signal.reason) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

/** A bounded sink: collect JSON or stop the upstream stream once its head ends. */
async function readBody(
  response: Response,
  kind: Body["kind"],
  maxBytes: number,
  signal: AbortSignal,
): Promise<Body | undefined> {
  const head = kind === "html" ? createHeadCollector() : undefined;
  const decoder = new TextDecoder();
  const complete = new AbortController();
  let size = 0,
    text = "",
    oversized = false,
    sourceError: unknown;
  if (response.body) {
    try {
      await response.body.pipeTo(
        new WritableStream<Uint8Array>({
          write(chunk) {
            const bytes = chunk.subarray(0, maxBytes - size);
            size += bytes.byteLength;
            const decoded = decoder.decode(bytes, { stream: true });
            if (head?.push(decoded)) {
              complete.abort();
            } else {
              if (!head) {
                text += decoded;
              }
              if (bytes.byteLength < chunk.byteLength) {
                oversized = true;
                complete.abort();
              }
            }
          },
          // pipeTo distinguishes source/abort failures from bugs in write().
          abort(error) {
            sourceError = error;
          },
        }),
        { signal: AbortSignal.any([signal, complete.signal]) },
      );
    } catch (error) {
      if (!complete.signal.aborted || error !== complete.signal.reason) {
        if (error === sourceError && isTransportFailure(error, signal)) {
          return undefined;
        }
        throw error;
      }
    }
  }
  if (oversized) {
    return undefined;
  }
  const tail = decoder.decode();
  if (!head) {
    return { kind: "json", text: text + tail };
  }
  head.push(tail);
  const result = head.finish();
  return result.error ? undefined : { kind: "html", head: result.value };
}

/** All actual requests share this one HTTP(S), credential-free network boundary. */
export async function fetchResource(
  original: string | URL,
  options: EmbedResolverOptions,
  signal: AbortSignal,
): Promise<(Body & { url: URL }) | undefined> {
  let url = parseHttpUrl(String(original));
  for (
    let redirects = 0;
    url && redirects <= (options.maxRedirects ?? 3);
    redirects++
  ) {
    let response: Response;
    try {
      signal.throwIfAborted();
      response = await options.protectedFetch(
        new Request(url, {
          redirect: "manual",
          signal,
          headers: {
            Accept: "text/html, application/json, application/json+oembed",
          },
        }),
      );
    } catch (error) {
      if (isTransportFailure(error, signal)) {
        return undefined;
      }
      throw error;
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      void response.body?.cancel().catch(() => {});
      const location = response.headers.get("location");
      url = location ? parseHttpUrl(location, url) : undefined;
      continue;
    }
    const type = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    const kind =
      type === "text/html"
        ? "html"
        : type === "application/json" || type === "application/json+oembed"
          ? "json"
          : undefined;
    if (!response.ok || !kind) {
      void response.body?.cancel().catch(() => {});
      return undefined;
    }
    const body = await readBody(
      response,
      kind,
      options.maxResponseBytes ?? 512 * 1024,
      signal,
    );
    return body ? { ...body, url } : undefined;
  }
  return undefined;
}
