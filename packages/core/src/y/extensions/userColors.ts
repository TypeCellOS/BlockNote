import type { UserStore } from "../../user/index.js";

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
 * Fallback palette used when a user isn't resolved in the {@link UserStore} (or
 * has no color of their own). Deterministic in the user id so a mark keeps a
 * stable color until the real one loads.
 */
export const userColorPalette: Array<{ light: string; dark: string }> = [
  { light: "#fff0c2", dark: "#8a6d1a" },
  { light: "#fcc9c3", dark: "#8a2e24" },
  { light: "#d4e8eb", dark: "#4a7178" },
  { light: "#c2eeff", dark: "#1a6e8a" },
  { light: "#bef3ff", dark: "#0a7a8a" },
];

/**
 * Pick a user-color from the {@link UserStore} based on user ids, falling back
 * to a deterministic palette entry when the (first) user isn't resolved yet or
 * carries no color of their own.
 *
 * The lookup is synchronous against the store's current cache. It is
 * intentionally *not* baked into the suggestion mark attributes (which must stay
 * deterministic for the Yjs sync reconcile) — instead it drives a decoration
 * layer (see `AttributionExtension`) so colors can load and update
 * independently of the mark representation. When a user later resolves with
 * their own color, the next decoration rebuild picks it up.
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
  return userColorPalette[hashStr(firstId) % userColorPalette.length];
};
