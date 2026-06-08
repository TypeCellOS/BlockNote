import * as Y from "@y/y";
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
    protected readonly threadsYMap: Y.Type,
    auth: ThreadStoreAuth,
  ) {
    super(auth);
  }

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    const yThread = this.threadsYMap.getAttr(threadId) as Y.Type | undefined;
    if (!yThread) {
      throw new Error("Thread not found");
    }
    const thread = yMapToThread(yThread);
    return thread;
  }

  public getThreads(): Map<string, ThreadData> {
    const threadMap = new Map<string, ThreadData>();
    this.threadsYMap.forEachAttr((yThread, id) => {
      if (yThread instanceof Y.Type) {
        threadMap.set(id as string, yMapToThread(yThread));
      }
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
