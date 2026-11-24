// Match the host used by UniqueID in both Node and DOM environments.
export const testOptionsHost = (
  typeof window === "undefined" ? globalThis : window
) as { __TEST_OPTIONS?: { mockID?: number } };
