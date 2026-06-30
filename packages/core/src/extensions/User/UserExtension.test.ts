/**
 * @vitest-environment jsdom
 */
import { describe, expect, expectTypeOf, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { User, UserExtension } from "./index.js";

function setup(resolveUsers: (userIds: string[]) => Promise<User[]>) {
  const editor = BlockNoteEditor.create();
  return UserExtension({ resolveUsers })({ editor });
}

function makeUser(id: string): User {
  return {
    id,
    username: `user-${id}`,
    avatarUrl: `https://example.com/${id}.png`,
  };
}

describe("UserExtension", () => {
  it("loads users into the store and exposes them via getUser", async () => {
    const resolveUsers = vi.fn(async (ids: string[]) => ids.map(makeUser));
    const ext = setup(resolveUsers);

    await ext.loadUsers(["1", "2"]);

    expect(resolveUsers).toHaveBeenCalledTimes(1);
    expect(resolveUsers).toHaveBeenCalledWith(["1", "2"]);
    expect(ext.getUser("1")).toEqual(makeUser("1"));
    expect(ext.getUser("2")).toEqual(makeUser("2"));
    expect(ext.store.state.size).toBe(2);
  });

  it("does not re-fetch users that are already cached", async () => {
    const resolveUsers = vi.fn(async (ids: string[]) => ids.map(makeUser));
    const ext = setup(resolveUsers);

    await ext.loadUsers(["1", "2"]);
    await ext.loadUsers(["2", "3"]);

    // Only the missing "3" should be requested the second time.
    expect(resolveUsers).toHaveBeenCalledTimes(2);
    expect(resolveUsers).toHaveBeenNthCalledWith(2, ["3"]);

    await ext.loadUsers(["1", "2", "3"]);
    // Everything cached now → no further requests.
    expect(resolveUsers).toHaveBeenCalledTimes(2);
  });

  it("de-duplicates concurrent in-flight requests for the same user", async () => {
    const resolveUsers = vi.fn(
      (ids: string[]) =>
        new Promise<User[]>((resolve) =>
          setTimeout(() => resolve(ids.map(makeUser)), 10),
        ),
    );
    const ext = setup(resolveUsers);

    await Promise.all([ext.loadUsers(["1"]), ext.loadUsers(["1"])]);

    expect(resolveUsers).toHaveBeenCalledTimes(1);
    expect(ext.getUser("1")).toEqual(makeUser("1"));
  });

  it("refetchUsers ignores the cache and re-resolves", async () => {
    let counter = 0;
    const resolveUsers = vi.fn(async (ids: string[]) =>
      ids.map((id) => ({
        ...makeUser(id),
        username: `user-${id}-${counter++}`,
      })),
    );
    const ext = setup(resolveUsers);

    await ext.loadUsers(["1"]);
    expect(ext.getUser("1")?.username).toBe("user-1-0");

    await ext.refetchUsers(["1"]);
    expect(resolveUsers).toHaveBeenCalledTimes(2);
    expect(ext.getUser("1")?.username).toBe("user-1-1");
  });

  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/1548
  it("does not emit a store update when a user cannot be resolved", async () => {
    // Resolver that never returns the requested user (can't find it).
    const resolveUsers = vi.fn(async () => [] as User[]);
    const ext = setup(resolveUsers);

    const onUpdate = vi.fn();
    const unsubscribe = ext.store.subscribe(onUpdate);

    await ext.loadUsers(["missing"]);

    // Nothing was resolved, so no update should be emitted (which previously
    // could feed an infinite load loop in subscribers).
    expect(onUpdate).not.toHaveBeenCalled();
    expect(ext.getUser("missing")).toBeUndefined();

    unsubscribe();
  });

  it("infers a custom user type from resolveUsers' return type", async () => {
    type CustomUser = User & { role: "admin" | "member" };

    const resolveUsers = async (ids: string[]): Promise<CustomUser[]> =>
      ids.map((id) => ({ ...makeUser(id), role: "admin" as const }));

    const editor = BlockNoteEditor.create();
    const ext = UserExtension({ resolveUsers })({ editor });

    await ext.loadUsers(["1"]);

    const user = ext.getUser("1");
    // Type-level: the custom property flows through.
    expectTypeOf(ext.getUser).returns.toEqualTypeOf<CustomUser | undefined>();
    expectTypeOf(ext.store.state).toEqualTypeOf<Map<string, CustomUser>>();

    // Runtime: the resolved user carries the extra field.
    expect(user?.role).toBe("admin");
  });
});
