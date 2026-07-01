import type { User } from "@blocknote/core";

// Integer-like ids make it obvious if username resolution ever breaks: the
// version sidebar / diff tooltips would show a bare number (e.g. "1") instead
// of a name. The seed (`sampleDocument.ts`) attributes each contribution to one
// of these ids via `attribution.by`.
export const USERS: User[] = [
  { id: "1", username: "Alice", avatarUrl: "", color: "#e6194b" },
  { id: "2", username: "Bob", avatarUrl: "", color: "#3cb44b" },
  { id: "3", username: "Carol", avatarUrl: "", color: "#f58231" },
  { id: "4", username: "Dave", avatarUrl: "", color: "#4363d8" },
  { id: "5", username: "Erin", avatarUrl: "", color: "#911eb4" },
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
