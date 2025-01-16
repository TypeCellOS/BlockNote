import { EventEmitter } from "../../../util/EventEmitter.js";
import { User } from "../types.js";
export class UserStore<U extends User> extends EventEmitter<any> {
  private userCache: Map<string, U> = new Map();

  // avoid duplicate loads
  private loadingUsers = new Set<string>();

  public constructor(
    private readonly resolveUsers: (userIds: string[]) => Promise<U[]>
  ) {
    super();
  }

  public async loadUsers(userIds: string[]) {
    const missingUsers = userIds.filter(
      (id) => !this.userCache.has(id) && !this.loadingUsers.has(id)
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
        this.loadingUsers.delete(id);
      }
    }
  }

  public getUser(userId: string): U | undefined {
    return this.userCache.get(userId);
  }

  public subscribe(cb: (users: Map<string, U>) => void): () => void {
    return this.on("update", cb);
  }
}
