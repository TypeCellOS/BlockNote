import { Store } from "@tanstack/store";
import { createStore } from "../editor/BlockNoteExtension.js";

/**
 * A collaborator of the document.
 */
export type User = {
  /**
   * The {@link User}'s unique identifier
   */
  id: string;
  /**
   * The {@link User}'s name/label
   */
  username: string;
  /**
   * The {@link User}'s profile image
   */
  avatarUrl: string;
  /**
   * The color used to represent the user (e.g. for collaboration cursors).
   */
  color?: string;
  /**
   * A lighter variant of {@link color}.
   */
  colorLight?: string;
};

/**
 * A store that retrieves and caches information about users, generic over the
 * resolved user type `U`.
 *
 * Created via {@link createUserStore}. Features that need to resolve user ids to
 * user information (comments, suggestions, versions) build one internally and
 * expose it on their extension instance so their UI can read from it.
 */
export type UserStore<U extends User = User> = {
  /**
   * A store mapping user ids to the resolved {@link User} information.
   */
  store: Store<Map<User["id"], U>>;
  /**
   * Load information about users based on an array of user ids.
   *
   * Users that are already cached or currently being loaded are skipped, so
   * it is safe to call this often (e.g. on every render).
   */
  loadUsers: (userIds: User["id"][]) => Promise<void>;
  /**
   * Re-fetch information about users, ignoring the cache. Users that are
   * currently being loaded are still skipped to avoid duplicate requests.
   */
  refetchUsers: (userIds: User["id"][]) => Promise<void>;
  /**
   * Retrieve information about a user based on their id, if cached.
   *
   * The user has to be loaded via `loadUsers` first.
   */
  getUser: (userId: User["id"]) => U | undefined;
};

/**
 * Creates a {@link UserStore} that retrieves and caches information about users.
 *
 * It does this by calling `resolveUsers` for users that are not yet cached, and
 * stores the results in a BlockNote store so they can be subscribed to (e.g. via
 * `useStore` in React).
 *
 * `resolveUsers` is called with the ids of users that are not yet cached, and
 * should return the information for those users. The type of the returned users
 * is inferred and flows through to {@link UserStore.getUser} and the store, so
 * you can return a type with additional properties and have them be reported
 * back.
 *
 * See [Comments](https://www.blocknotejs.org/docs/features/collaboration/comments) for more info.
 */
export function createUserStore<U extends User = User>(
  resolveUsers: (userIds: User["id"][]) => Promise<U[]>,
): UserStore<U> {
  if (!resolveUsers) {
    throw new Error("resolveUsers is required to create a user store");
  }

  const store = createStore(new Map<User["id"], U>());

  // Tracks users that are currently being fetched, to avoid duplicate
  // in-flight requests. This is intentionally kept out of the store as it is
  // not state that consumers need to subscribe to.
  const loadingUsers = new Set<User["id"]>();

  async function fetchUsers(userIds: User["id"][]) {
    if (userIds.length === 0) {
      return;
    }

    for (const id of userIds) {
      loadingUsers.add(id);
    }

    try {
      const users = await resolveUsers(userIds);
      // Only update the store if any users were actually resolved. Emitting
      // an update when nothing changed (e.g. when the resolver can't find a
      // user) would needlessly notify subscribers and, combined with a
      // subscriber that re-triggers loading, could cause an infinite loop.
      // See https://github.com/TypeCellOS/BlockNote/issues/1548
      if (users.length > 0) {
        store.setState((prevState) => {
          const nextState = new Map(prevState);
          for (const user of users) {
            nextState.set(user.id, user);
          }
          return nextState;
        });
      }
    } finally {
      for (const id of userIds) {
        // Remove the users from the loading set. On a next call to `loadUsers`
        // we will either return the cached user, or retry loading the user if
        // the request failed.
        loadingUsers.delete(id);
      }
    }
  }

  return {
    store,
    async loadUsers(userIds: User["id"][]) {
      const missingUsers = userIds.filter(
        (id) => !store.state.has(id) && !loadingUsers.has(id),
      );
      await fetchUsers(missingUsers);
    },
    async refetchUsers(userIds: User["id"][]) {
      const usersToFetch = userIds.filter((id) => !loadingUsers.has(id));
      await fetchUsers(usersToFetch);
    },
    getUser(userId: User["id"]): U | undefined {
      return store.state.get(userId);
    },
  };
}

/**
 * A resolver callback or an already-built {@link UserStore} — the shape that
 * user-facing options (comments, collaboration) accept so callers can either let
 * the extension build a store or pass a shared one.
 */
export type UserStoreOrResolver<U extends User = User> =
  | ((userIds: User["id"][]) => Promise<U[]>)
  | UserStore<U>;

/**
 * Normalize a {@link UserStoreOrResolver} to a {@link UserStore}:
 * - an existing store is returned as-is (so a single de-duped cache can be
 *   shared across extensions),
 * - a resolver function is wrapped with {@link createUserStore},
 * - `undefined` yields an empty store that resolves nothing (consumers then fall
 *   back to showing raw user ids).
 */
export function normalizeToUserStore<U extends User = User>(
  resolveUsersOrStore?: UserStoreOrResolver<U>,
): UserStore<U> {
  if (typeof resolveUsersOrStore === "function") {
    return createUserStore(resolveUsersOrStore);
  }
  return resolveUsersOrStore ?? createUserStore<U>(async () => []);
}
