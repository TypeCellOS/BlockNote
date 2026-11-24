type TestOptionsHost = { __TEST_OPTIONS?: { mockID?: number } };

export function getTestOptionsHost(): TestOptionsHost {
  // Match core's UniqueID host in both jsdom and Node.
  const host = typeof window === "undefined" ? globalThis : window;
  return host as typeof host & TestOptionsHost;
}
