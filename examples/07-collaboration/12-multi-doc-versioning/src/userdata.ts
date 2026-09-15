import type { User } from "@blocknote/core";

export function getById(id: string): User {
  return (
    USERS.find((u) => u.id === id) ?? {
      id,
      username: "Unknown",
      avatarUrl: "",
      color: "#000000",
      colorLight: "#cccccc",
    }
  );
}

// Integer-like ids make it obvious if username resolution ever breaks: the UI
// would show a bare number (e.g. "1") instead of a name.
// The light/dark pairs are BlockNote's own attribution palette
// (`userColorPalette`), so the marks look the same as they would for a user
// with no color of their own.
export const USERS: User[] = [
  {
    id: "1",
    username: "Alice",
    avatarUrl: "",
    color: "#3b3f9c",
    colorLight: "#dcdefc",
  },
  {
    id: "2",
    username: "Bob",
    avatarUrl: "",
    color: "#0f6e62",
    colorLight: "#c9efe9",
  },
  {
    id: "3",
    username: "Charlie",
    avatarUrl: "",
    color: "#1e4fb0",
    colorLight: "#c9dcff",
  },
  {
    id: "4",
    username: "Dana",
    avatarUrl: "",
    color: "#6b2fa3",
    colorLight: "#eadcfb",
  },
];

/**
 * Resolves user ids to user info. Passed to the collaboration options as
 * `resolveUsers`, which the versioning UI uses to display version authors (and
 * diff tooltips) by name instead of id. Mirrors the `resolveUsers` you'd
 * normally back with your own user database.
 */
export async function resolveUsers(userIds: string[]): Promise<User[]> {
  return USERS.filter((u) => userIds.includes(u.id));
}
