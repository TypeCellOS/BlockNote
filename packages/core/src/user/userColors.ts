import { digestString } from "lib0/hash/fnv1a";
import type { UserStore } from "./UserStore.js";

/**
 * Deterministic hash of a string to an unsigned 32-bit integer.
 */
const hashStr = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i);
  }
  return Math.abs(hash);
};

/** Fallback palette used when a user has no resolved color of their own. */
export const userColorPalette: Array<{ light: string; dark: string }> = [
  { light: "#fff0c2", dark: "#8a6d1a" },
  { light: "#fcc9c3", dark: "#8a2e24" },
  { light: "#d4e8eb", dark: "#4a7178" },
  { light: "#c2eeff", dark: "#1a6e8a" },
  { light: "#bef3ff", dark: "#0a7a8a" },
];

/** The deterministic {@link userColorPalette} entry for a single user id. */
export const fallbackColorForUserId = (
  id: string,
): { light: string; dark: string } =>
  userColorPalette[hashStr(id) % userColorPalette.length];

/**
 * The (first) user's resolved color from the {@link UserStore}, or their
 * {@link fallbackColorForUserId} palette entry. Used where a concrete color
 * string is needed (the portaled hover tooltip); marks themselves use the
 * cascaded {@link userColorVarNames} properties instead.
 */
export const colorsForUserIds = (
  userStore: UserStore,
  userIds: readonly string[] | undefined | null,
): { light: string; dark: string } => {
  if (!userIds || userIds.length === 0) {
    return userColorPalette[0];
  }
  const firstId = userIds[0];
  const user = userStore.getUser(firstId);
  if (user?.color && user.colorLight) {
    return { light: user.colorLight, dark: user.color };
  }
  return fallbackColorForUserId(firstId);
};

/**
 * Reduce a user id to a fixed-width `[0-9a-f]` token safe to embed in a CSS
 * custom-property name. Uses the (non-cryptographic) FNV-1a 32-bit hash; a
 * collision only means two authors share a highlight color.
 */
export const cssVarUserId = (id: string): string =>
  digestString(id).toString(16).padStart(8, "0");

/**
 * The `--user-color-<key>-{light,dark}` custom-property names for a user. Set on
 * the editor root by `AttributionExtension`, read by the mark wrapper via
 * `var(..., <fallback>)`.
 */
export const userColorVarNames = (
  id: string,
): { light: string; dark: string } => {
  const key = cssVarUserId(id);
  return {
    light: `--user-color-${key}-light`,
    dark: `--user-color-${key}-dark`,
  };
};
