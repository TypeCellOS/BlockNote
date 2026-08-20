import * as Y from "@y/y";
import type { ThreadData } from "../../comments/types.js";
import { ThreadStore } from "../../comments/threadstore/ThreadStore.js";
import type { ThreadStoreAuth } from "../../comments/threadstore/ThreadStoreAuth.js";
import { yTypeToThread } from "./yjsHelpers.js";

/**
 * This is an abstract class that only implements the READ methods required by the ThreadStore interface.
 * The data is read from a @y/y Type used as a map (via attributes).
 */
export abstract class YjsThreadStoreBase extends ThreadStore {
  constructor(
    protected readonly threadsYType: Y.Type,
    auth: ThreadStoreAuth,
  ) {
    super(auth);
  }

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    const yThread = this.threadsYType.getAttr(threadId);
    if (!yThread) {
      throw new Error("Thread not found");
    }
    const thread = yTypeToThread(yThread);
    return thread;
  }

  public getThreads(): Map<string, ThreadData> {
    const threadMap = new Map<string, ThreadData>();
    this.threadsYType.forEachAttr((yThread: any, id: string | number) => {
      if (yThread instanceof Y.Type) {
        threadMap.set(String(id), yTypeToThread(yThread));
      }
    });
    return threadMap;
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void) {
    const observer = () => {
      cb(this.getThreads());
    };

    this.threadsYType.observeDeep(observer);

    return () => {
      this.threadsYType.unobserveDeep(observer);
    };
  }
}
