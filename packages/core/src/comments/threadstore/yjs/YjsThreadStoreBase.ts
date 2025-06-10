import * as Y from "yjs";
import { ThreadData } from "../../types.js";
import { ThreadStore } from "../ThreadStore.js";
import { ThreadStoreAuth } from "../ThreadStoreAuth.js";
import { yMapToThread } from "./yjsHelpers.js";

/**
 * This is an abstract class that only implements the READ methods required by the ThreadStore interface.
 * The data is read from a Yjs Map.
 */
export abstract class YjsThreadStoreBase extends ThreadStore {
  constructor(
    protected readonly threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(auth);
  }

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    const yThread = this.threadsYMap.get(threadId);
    if (!yThread) {
      throw new Error("Thread not found");
    }
    const thread = yMapToThread(yThread);
    return thread;
  }

  public getThreads(): Map<string, ThreadData> {
    const threadMap = new Map<string, ThreadData>();
    this.threadsYMap.forEach((yThread, id) => {
      threadMap.set(id, yMapToThread(yThread));
    });
    return threadMap;
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void) {
    const observer = () => {
      cb(this.getThreads());
    };

    this.threadsYMap.observeDeep(observer);

    return () => {
      this.threadsYMap.unobserveDeep(observer);
    };
  }
}
