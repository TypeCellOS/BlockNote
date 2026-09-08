/** Expansion is per-user view state, outside the document and undo history. */
export type ToggledState<B extends { id: string } = { id: string }> = {
  set: (block: B, expanded: boolean) => void;
  get: (block: B) => boolean;
};

// Only keys that cannot be persisted live here. Once a write fails, reads of
// that key must not return an older value from otherwise-readable storage.
const fallback = new Map<string, boolean>();

function isStorageUnavailable(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "SecurityError" || error.name === "QuotaExceededError")
  );
}

export const defaultToggledState: ToggledState = {
  set(block, expanded) {
    if (fallback.has(block.id) || typeof window === "undefined") {
      fallback.set(block.id, expanded);
      return;
    }
    try {
      window.localStorage.setItem(`toggle-${block.id}`, String(expanded));
    } catch (error) {
      if (!isStorageUnavailable(error)) {
        throw error;
      }
      fallback.set(block.id, expanded);
    }
  },
  get(block) {
    const value = fallback.get(block.id);
    if (value !== undefined) {
      return value;
    }
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem(`toggle-${block.id}`) === "true";
    } catch (error) {
      if (!isStorageUnavailable(error)) {
        throw error;
      }
      return false;
    }
  },
};
