import { useEffect, useState } from "react";
import type { ResolveResult } from "./types.js";

/** Private React 18-compatible lifetime shared by the live providers. */
export function useEmbedResource<T>(
  url: string,
  resolve:
    | ((
        url: string,
        options: { signal: AbortSignal },
      ) => Promise<ResolveResult<T>>)
    | undefined,
): { status: "loading" } | ResolveResult<T> {
  const [resource, setResource] = useState<{
    url: string;
    resolve: typeof resolve;
    result:
      | { status: "loading" }
      | { status: "error"; error: unknown }
      | ResolveResult<T>;
  }>({ url, resolve, result: { status: "loading" } });
  useEffect(() => {
    const controller = new AbortController();
    if (resolve) {
      const resolver = resolve;
      async function load() {
        // A synchronous resolver bug must not tear down the editor's node view
        // from inside the transaction that mounted it. Report on the next render.
        await Promise.resolve();
        if (controller.signal.aborted) {
          return;
        }
        try {
          const result = await resolver(url, { signal: controller.signal });
          if (!controller.signal.aborted) {
            setResource({ url, resolve, result });
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setResource({ url, resolve, result: { status: "error", error } });
          }
        }
      }
      void load();
    }
    return () => controller.abort();
  }, [url, resolve]);
  if (!resolve) {
    return { status: "unavailable" };
  }
  if (resource.url !== url || resource.resolve !== resolve) {
    return { status: "loading" };
  }
  if (resource.result.status === "error") {
    throw resource.result.error;
  }
  return resource.result;
}
