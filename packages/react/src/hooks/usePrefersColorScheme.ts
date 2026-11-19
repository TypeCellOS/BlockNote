import { useSyncExternalStore } from "react";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

function getSnapshot(): "dark" | "light" | "no-preference" {
  if (window.matchMedia?.(DARK_QUERY).matches) {
    return "dark";
  }
  if (window.matchMedia?.(LIGHT_QUERY).matches) {
    return "light";
  }
  return "no-preference";
}

function subscribe(onChange: () => void) {
  const queries = [DARK_QUERY, LIGHT_QUERY].map((query) =>
    window.matchMedia?.(query),
  );
  for (const query of queries) {
    query?.addEventListener("change", onChange);
  }
  return () => {
    for (const query of queries) {
      query?.removeEventListener("change", onChange);
    }
  };
}

/**
 * Returns the system color scheme and subscribes to changes without mirroring
 * browser state into React state. On the server, no preference is assumed.
 */
export function usePrefersColorScheme() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "no-preference" as const,
  );
}
