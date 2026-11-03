import type { TextUpdate, ValidTextUpdate } from "../api.js";

/** Returns the update, and fails the test if the update is an error. */
export function valid<T extends TextUpdate>(
  update: T,
): Exclude<T, { error: string }> {
  if (update.error !== undefined) {
    throw new Error(`The update is an error: ${update.error}`);
  }
  return update as Exclude<T, { error: string }>;
}

export type { ValidTextUpdate };
