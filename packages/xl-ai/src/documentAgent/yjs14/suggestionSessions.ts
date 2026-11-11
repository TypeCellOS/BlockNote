import type { BlockNoteEditorOptions } from "@blocknote/core";
import type * as Y from "@y/y";
import type { UIMessage } from "ai";

import { recordReview } from "../agent/chatReview.js";
import type { DocumentAgentOptions } from "../agent/documentAgent.js";
import {
  type ChatSessions,
  createChatSessions,
} from "../sessions/chatSessions.js";
import type { ChatStore } from "../stores/chatStore.js";
import type { ToolCallReview } from "../tools/documentTools.js";
import { createSuggestionDocument } from "./suggestionDocument.js";
import { toolCallRecordsOf } from "./toolCallRecords.js";

/** The state of the session of a document in Yjs 14 mode, for a client that opens it. */
export type SuggestionSessionSnapshot = {
  /** The chat of the document: each request, and each message of the agent. */
  messages: UIMessage[];
  /** The run in progress. A client follows its chat stream. */
  activeRunId: string | undefined;
};

/**
 * The replica of the suggestion document of a document on a host, for one
 * use: a run, or a read of the decisions of the users.
 */
export type OpenedSuggestion = {
  suggestion: Y.Doc;
  /** The name of the type of the document content in the Y.Doc. */
  fragment: string;
  editorOptions?: Partial<BlockNoteEditorOptions<any, any, any>>;
  /**
   * Called at the end of the use. An app that connects a Yjs provider in
   * `openSuggestion` disconnects it here.
   */
  close?(): void;
};

export type SuggestionSessionHostOptions = DocumentAgentOptions & {
  /**
   * Gives the replica of the suggestion document of a document on this
   * host, or `undefined` if the host does not have the document. The host
   * calls it for each run and for each read of the session, and calls
   * `close` of the result after that.
   *
   * This function is where the app uses its Yjs provider: the host does
   * not know the provider. The replica must be in sync when the promise
   * resolves. It must get each update of the main document (see
   * `keepSuggestionCurrent`), and it must not collect garbage (`gc:
   * false`).
   */
  openSuggestion(documentId: string): Promise<OpenedSuggestion | undefined>;
  /**
   * The store of the chats. The default is a store in the memory of this
   * process (see `ChatStore`).
   */
  chats?: ChatStore;
  /** Called when the session of a document changed: a run started or ended. */
  onChange?(documentId: string): void;
  /** Called when the stream of a run failed. This is a bug or an outage. */
  onRunError?(documentId: string, error: unknown): void;
};

/**
 * The sessions of the documents of a host in Yjs 14 mode: the chat of each
 * document, and its run in progress. The chats and the runs are the shared
 * code of `sessions/chatSessions.ts`.
 *
 * This host keeps no proposal, and it has no part in the review. The
 * changes of the agent are in the suggestion document, and each editor
 * gets them through the Yjs sync. A decision of a user is a change of the
 * Y.Docs. The host only reads the decisions before a run: they go into the
 * outputs of the tool calls in the chat, and the agent gets them.
 */
export type SuggestionSessionHost = {
  /**
   * The chat and the run in progress of the document. The outputs of the
   * tool calls in the chat have the decisions of the users.
   */
  snapshot(documentId: string): Promise<SuggestionSessionSnapshot>;
  startRun: ChatSessions["startRun"];
  activeRun: ChatSessions["activeRun"];
  stopRun: ChatSessions["stopRun"];
};

export function createSuggestionSessionHost(
  options: SuggestionSessionHostOptions,
): SuggestionSessionHost {
  /**
   * Puts the decisions of the users for the tool calls into the chat of
   * the document. The decisions are in the suggestion document: the host
   * has no part in them.
   */
  function recordDecisions(documentId: string, suggestion: Y.Doc) {
    const decisions = new Map<string, ToolCallReview>();
    for (const record of toolCallRecordsOf(suggestion)) {
      if (record.decision !== undefined) {
        decisions.set(record.toolCallId, record.decision);
      }
    }
    return chats.updateMessages(documentId, (messages) =>
      recordReview(messages, decisions),
    );
  }

  const chats = createChatSessions({
    ...options,
    async openRun(documentId) {
      const opened = await options.openSuggestion(documentId);
      if (opened === undefined) {
        return undefined;
      }
      try {
        // The decisions of the users after the last run: the agent must
        // not make a rejected change again.
        await recordDecisions(documentId, opened.suggestion);
        const document = createSuggestionDocument(opened);
        return {
          document,
          close() {
            document.destroy();
            opened.close?.();
          },
        };
      } catch (error) {
        // The run does not start: the replica is not in use.
        opened.close?.();
        throw error;
      }
    },
  });

  return {
    startRun: (documentId, request) => chats.startRun(documentId, request),
    activeRun: (documentId) => chats.activeRun(documentId),
    stopRun: (documentId) => chats.stopRun(documentId),
    async snapshot(documentId) {
      const opened = await options.openSuggestion(documentId);
      if (opened !== undefined) {
        try {
          await recordDecisions(documentId, opened.suggestion);
        } finally {
          opened.close?.();
        }
      }
      return {
        messages: await chats.messages(documentId),
        activeRunId: chats.activeRun(documentId)?.id,
      };
    },
  };
}
