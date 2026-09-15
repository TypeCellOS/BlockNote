import type { User, UserStore } from "@blocknote/core";

// Integer-like ids make it obvious if username resolution ever breaks: the
// version sidebar / diff tooltips would show a bare number (e.g. "1") instead
// of a name. The seed (`sampleDocument.ts`) attributes each contribution to one
// of these ids via `attribution.by`.
// Colors are the `dark` values of BlockNote's own attribution palette
// (`userColorPalette`). Only `color` is set, so the pale mark background is
// derived from it (see `userMarkColors`).
export const USERS: User[] = [
  { id: "1", username: "Alice", avatarUrl: "", color: "#3b3f9c" },
  { id: "2", username: "Bob", avatarUrl: "", color: "#0f6e62" },
  { id: "3", username: "Carol", avatarUrl: "", color: "#1e4fb0" },
  { id: "4", username: "Dave", avatarUrl: "", color: "#6b2fa3" },
  { id: "5", username: "Erin", avatarUrl: "", color: "#46525f" },
];

/**
 * Resolves user ids to user info. Passed to the collaboration options as
 * `resolveUsers`, which the versioning UI uses to display version authors (and
 * diff tooltips) by name instead of id. Mirrors the `resolveUsers` you'd
 * normally back with your own user database.
 */
export async function resolveUsers(
  userIds: string[],
  store: UserStore<any>,
): Promise<User[]> {
  setTimeout(
    () => {
      store.setUser(USERS.filter((u) => userIds.includes(u.id)));
    },
    Math.random() * 200 + 300,
  );
  return [USERS[0]];
}
