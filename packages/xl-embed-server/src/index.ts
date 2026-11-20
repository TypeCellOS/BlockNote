import { resolveSource } from "./resolve.js";
import type { EmbedResolver, EmbedResolverOptions } from "./types.js";

export type * from "./types.js";

/** Experimental Fetchable oEmbed reference. The application owns routing. */
export function createEmbedResolver(
  options: EmbedResolverOptions,
): EmbedResolver {
  return {
    async fetch(request) {
      if (request.method !== "GET") {
        return new Response(null, { status: 405, headers: { Allow: "GET" } });
      }
      const params = new URL(request.url).searchParams;
      return Response.json(
        await resolveSource(
          params.get("url") ?? "",
          {
            maxwidth: params.get("maxwidth") ?? undefined,
            maxheight: params.get("maxheight") ?? undefined,
          },
          options,
          AbortSignal.any([
            request.signal,
            AbortSignal.timeout(options.timeoutMs ?? 5000),
          ]),
        ),
      );
    },
  };
}
