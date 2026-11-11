import type { UIMessage } from "ai";

/** The chat of a document on a host, and its run in progress. */
export type Chat = {
  /** Each request, and each message of the agent. */
  messages: UIMessage[];
  /**
   * The ID of the run in progress of the document. A document has one run
   * at a time. The stream of the run is in the run store (see `RunStore`).
   */
  activeRunId?: string;
};

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
  load(documentId: string): Promise<Chat>;
  /**
   * Changes the chat of a document, and returns the new chat. The store
   * applies the change to the newest chat: two changes at the same time
   * must not lose a message, and only one of two processes can start a run
   * (the start sets `activeRunId` if the chat has none). A store on a
   * database uses a transaction or a compare and swap, and can call
   * `change` more than one time.
   */
  update(documentId: string, change: (chat: Chat) => Chat): Promise<Chat>;
};

/** A chat store in the memory of this process. */
export function createInMemoryChatStore(): ChatStore {
  const chats = new Map<string, Chat>();
  return {
    load(documentId) {
      return Promise.resolve(chats.get(documentId) ?? { messages: [] });
    },
    update(documentId, change) {
      // The change applies in this call, not after it: a `load` that comes
      // next has the new chat.
      const chat = change(chats.get(documentId) ?? { messages: [] });
      chats.set(documentId, chat);
      return Promise.resolve(chat);
    },
  };
}
