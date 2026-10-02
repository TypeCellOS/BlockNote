import { digestString } from "lib0/hash/fnv1a";
import type { User, UserStore } from "./UserStore.js";

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

/**
 * Fallback palette used when a user has no resolved color of their own.
 *
 * Deliberately red-free: these colors tint *insertions* as well as deletions,
 * and a red insertion reads as an error rather than as one author's
 * contribution. The hues are spread far enough apart to stay distinguishable
 * for the most common forms of colour-vision deficiency.
 */
export const userColorPalette: Array<{ light: string; dark: string }> = [
  { light: "#fff0c2", dark: "#8a6d1a" }, // amber
  { light: "#dcdefc", dark: "#3b3f9c" }, // indigo
  { light: "#c9efe9", dark: "#0f6e62" }, // teal
  { light: "#c9dcff", dark: "#1e4fb0" }, // blue
  { light: "#eadcfb", dark: "#6b2fa3" }, // violet
  { light: "#dfe4ea", dark: "#46525f" }, // slate
];

/** The deterministic {@link userColorPalette} entry for a single user id. */
export const fallbackColorForUserId = (
  id: string,
): { light: string; dark: string } =>
  userColorPalette[hashStr(id) % userColorPalette.length];

/**
 * A user's own mark colors, or `undefined` when they have none.
 *
 * `color` is the saturated color the app already uses for that user (cursors,
 * avatars); `colorLight` is the pale background a mark is highlighted with. Most
 * applications only set the former, so derive the latter rather than fall back
 * to a palette entry that has nothing to do with the user's actual color — a
 * user whose cursor is green shouldn't have amber marks.
 */
export const userMarkColors = (
  user: Pick<User, "color" | "colorLight"> | undefined,
): { light: string; dark: string } | undefined => {
  if (!user?.color) {
    return undefined;
  }
  return {
    light: user.colorLight ?? `color-mix(in srgb, ${user.color} 30%, white)`,
    dark: user.color,
  };
};

/**
 * The (first) user's {@link userMarkColors}, or their
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
  return (
    userMarkColors(userStore.getUser(firstId)) ??
    fallbackColorForUserId(firstId)
  );
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
