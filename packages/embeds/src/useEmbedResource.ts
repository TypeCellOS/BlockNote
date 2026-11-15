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
    result: { status: "loading" } | ResolveResult<T>;
  }>({ url, resolve, result: { status: "loading" } });
  useEffect(() => {
    const controller = new AbortController();
    if (resolve) {
      void resolve(url, { signal: controller.signal }).then((result) => {
        if (!controller.signal.aborted) {
          setResource({ url, resolve, result });
        }
      });
    }
    return () => controller.abort();
  }, [url, resolve]);
  if (!resolve) {
    return { status: "unavailable" };
  }
  return resource.url === url && resource.resolve === resolve
    ? resource.result
    : { status: "loading" };
}
