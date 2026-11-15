import type { EmbedProvider } from "./types.js";

/** Define a provider with checked URL matching and rendering, preserving its ID. */
export function createProvider<const Id extends string>(
  provider: EmbedProvider & { id: Id },
): EmbedProvider & { id: Id } {
  return provider;
}
