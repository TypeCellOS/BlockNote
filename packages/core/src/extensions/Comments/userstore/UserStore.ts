import type { User } from "../../../comments/index.js";
import { EventEmitter } from "../../../util/EventEmitter.js";

/**
 * The `UserStore` is used to retrieve and cache information about users.
 *
 * It does this by calling `resolveUsers` (which is user-defined in the Editor Options)
 * for users that are not yet cached.
 */
export class UserStore<U extends User> extends EventEmitter<any> {
  private userCache: Map<string, U> = new Map();

  // avoid duplicate loads
  private loadingUsers = new Set<string>();

  public constructor(
    private readonly resolveUsers: (userIds: string[]) => Promise<U[]>,
  ) {
    super();
  }

  /**
   * Load information about users based on an array of user ids.
   */
  public async loadUsers(userIds: string[]) {
    const missingUsers = userIds.filter(
      (id) => !this.userCache.has(id) && !this.loadingUsers.has(id),
    );

    if (missingUsers.length === 0) {
      return;
    }

    for (const id of missingUsers) {
      this.loadingUsers.add(id);
    }

    try {
      const users = await this.resolveUsers(missingUsers);
      for (const user of users) {
        this.userCache.set(user.id, user);
      }
      this.emit("update", this.userCache);
    } finally {
      for (const id of missingUsers) {
        // delete the users from the loading set
        // on a next call to `loadUsers` we will either
        // return the cached user or retry loading the user if the request failed failed
        this.loadingUsers.delete(id);
      }
    }
  }

  /**
   * Retrieve information about a user based on their id, if cached.
   *
   * The user will have to be loaded via `loadUsers` first
   */
  public getUser(userId: string): U | undefined {
    return this.userCache.get(userId);
  }

  /**
   * Subscribe to changes in the user store.
   *
   * @param cb - The callback to call when the user store changes.
   * @returns A function to unsubscribe from the user store.
   */
  public subscribe(cb: (users: Map<string, U>) => void): () => void {
    return this.on("update", cb);
  }
}
