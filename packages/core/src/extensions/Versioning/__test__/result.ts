import type { VersionResult } from "../types.js";

export function success<T>(value: T): VersionResult<T> {
  return { ok: true, value };
}

export function resultValue<T>(result: VersionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected success, got ${result.error.type}`);
  }
  return result.value;
}
