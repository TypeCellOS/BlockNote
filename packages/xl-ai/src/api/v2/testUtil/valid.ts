import type { ChangeOperations } from "../api.js";

/**
 * Returns the update, and fails the test if the update is an error. The
 * update is the result of a write to an editor or to a Y.Doc.
 */
export function valid<T extends { error?: string }>(
  update: T,
): Exclude<T, { error: string }> {
  if (update.error !== undefined) {
    throw new Error(`The update is an error: ${update.error}`);
  }
  return update as Exclude<T, { error: string }>;
}

export type { ChangeOperations };
