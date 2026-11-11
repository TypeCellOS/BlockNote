import type { BlockNoteEditorOptions } from "@blocknote/core";
import type * as Y from "@y/y";
import type { UIMessage } from "ai";

import { recordReview } from "../agent/chatReview.js";
import type { DocumentAgentOptions } from "../agent/documentAgent.js";
import {
  type ChatSessions,
  createChatSessions,
} from "../sessions/chatSessions.js";
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

export type SuggestionSessionHostOptions = DocumentAgentOptions & {
  /**
   * The replica of the suggestion document of a document on this host, or
   * `undefined` if the host does not have the document. The host must
   * apply each update of the main document to it (see
   * `keepSuggestionCurrent`).
   */
  openSuggestion(documentId: string): Promise<
    | {
        suggestion: Y.Doc;
        /** The name of the type of the document content in the Y.Doc. */
        fragment: string;
        editorOptions?: Partial<BlockNoteEditorOptions<any, any, any>>;
      }
    | undefined
  >;
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
  snapshot(documentId: string): SuggestionSessionSnapshot;
  startRun: ChatSessions["startRun"];
  activeRun: ChatSessions["activeRun"];
  stopRun: ChatSessions["stopRun"];
};

export function createSuggestionSessionHost(
  options: SuggestionSessionHostOptions,
): SuggestionSessionHost {
  const chats = createChatSessions({
    ...options,
    async openRun(documentId) {
      const opened = await options.openSuggestion(documentId);
      if (opened === undefined) {
        return undefined;
      }
      // The decisions of the users after the last run: the agent must not
      // make a rejected change again.
      const decisions = new Map<string, ToolCallReview>();
      for (const record of toolCallRecordsOf(opened.suggestion)) {
        if (record.decision !== undefined) {
          decisions.set(record.toolCallId, record.decision);
        }
      }
      chats.setMessages(
        documentId,
        recordReview(chats.messages(documentId), decisions),
      );
      const document = createSuggestionDocument(opened);
      return { document, close: () => document.destroy() };
    },
  });

  return {
    startRun: (documentId, request) => chats.startRun(documentId, request),
    activeRun: (documentId) => chats.activeRun(documentId),
    stopRun: (documentId) => chats.stopRun(documentId),
    snapshot: (documentId) => ({
      messages: chats.messages(documentId),
      activeRunId: chats.activeRun(documentId)?.id,
    }),
  };
}
