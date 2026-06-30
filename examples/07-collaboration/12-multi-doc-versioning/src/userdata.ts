import type { User } from "@blocknote/core/extensions";

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
export const USERS: User[] = [
  {
    id: "1",
    username: "Alice",
    avatarUrl: "",
    color: "#e6194b",
    colorLight: "#e6194b33",
  },
  {
    id: "2",
    username: "Bob",
    avatarUrl: "",
    color: "#3cb44b",
    colorLight: "#3cb44b33",
  },
  {
    id: "3",
    username: "Charlie",
    avatarUrl: "",
    color: "#f58231",
    colorLight: "#f5823133",
  },
  {
    id: "4",
    username: "Dana",
    avatarUrl: "",
    color: "#4363d8",
    colorLight: "#4363d833",
  },
];

/**
 * Resolves user ids to user info for the `UserExtension`, which the versioning
 * UI uses to display version authors (and diff tooltips) by name instead of id.
 * Mirrors the `resolveUsers` you'd normally back with your own user database.
 */
export async function resolveUsers(userIds: string[]): Promise<User[]> {
  return USERS.filter((u) => userIds.includes(u.id));
}
