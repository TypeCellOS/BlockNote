import type { UIMessage } from "ai";

/**
 * A store for the chats of the documents of a host. The session code of
 * each mode uses it (`sessions/chatSessions.ts`).
 *
 * The store in memory is sufficient for one process, and for a test. A
 * production host gives a store on its database: then the chat stays after
 * a restart, and each process of the host has the same chat.
 */
export type ChatStore = {
  /** The chat of a document. A new document has no messages. */
  load(documentId: string): Promise<UIMessage[]>;
  /**
   * Changes the chat of a document, and returns the new chat. The store
   * applies the change to the newest chat: two changes at the same time
   * must not lose a message. A store on a database uses a transaction or a
   * compare and swap, and can call `change` more than one time.
   */
  update(
    documentId: string,
    change: (messages: UIMessage[]) => UIMessage[],
  ): Promise<UIMessage[]>;
};

/** A chat store in the memory of this process. */
export function createInMemoryChatStore(): ChatStore {
  const chats = new Map<string, UIMessage[]>();
  return {
    load(documentId) {
      return Promise.resolve(chats.get(documentId) ?? []);
    },
    update(documentId, change) {
      // The change applies in this call, not after it: a `load` that comes
      // next has the new chat.
      const messages = change(chats.get(documentId) ?? []);
      chats.set(documentId, messages);
      return Promise.resolve(messages);
    },
  };
}
