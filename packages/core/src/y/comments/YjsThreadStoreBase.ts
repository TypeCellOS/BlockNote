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
    // Deferred out of the Yjs observer chain: `observeDeep` fires inside the
    // transaction that changed the threads (a local comment edit, or a remote
    // update mid-apply on the provider's chain). Subscribers do real work —
    // the comments extension walks the whole doc and dispatches mark updates —
    // and running that synchronously inside the commit means a subscriber
    // failure unwinds into the sync machinery and gets misattributed there
    // (see the suggestion gallery's deferred `renderDiff` for the same
    // pattern). The microtask also coalesces observer bursts into a single
    // callback and moves the `getThreads()` materialization out of the
    // committing transaction.
    let queued = false;
    let unsubscribed = false;
    const observer = () => {
      if (queued) {
        return;
      }
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!unsubscribed) {
          cb(this.getThreads());
        }
      });
    };

    this.threadsYType.observeDeep(observer);

    return () => {
      unsubscribed = true;
      this.threadsYType.unobserveDeep(observer);
    };
  }
}
