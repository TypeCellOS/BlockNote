import type { BlockNoteEditor } from "@blocknote/core";
import { useExtension, useExtensionState } from "@blocknote/react";
import {
  DocumentAgentExtension,
  type DocumentAgentExtensionOptions,
  documentAgentOf,
  type SessionSnapshot,
} from "@blocknote/xl-ai";
import type * as Y14 from "@y/y";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import type * as Y from "yjs";

// The connection of an editor to the session of its document on the
// server. The server keeps the chat and the one open proposal of the
// document (`createSessionHost` of `@blocknote/xl-ai`, and the routes
// `/sessions/...` of `packages/xl-ai-server`).

/**
 * The transport of the chat for a session:
 *
 * - A message of the user goes to the server, which starts a run. The
 *   server has the chat, thus the request has only the new message.
 * - The stream of the run in progress comes from `/stream`, from its
 *   start. The editor follows a run that it did not start there.
 */
export function createSessionTransport(sessionUrl: string) {
  return new DefaultChatTransport({
    api: `${sessionUrl}/messages`,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { message: messages.at(-1) },
    }),
    prepareReconnectToStreamRequest: () => ({ api: `${sessionUrl}/stream` }),
    resumeStreamIsReplay: true,
  });
}

/**
 * The options of the document agent that send the review of the user to
 * the server: the accept or the reject of one tool call is a batch of the
 * proposal, and the accept or the reject of all closes the proposal.
 *
 * Without `guard` (the base scenario), the editor writes an accept to the
 * document at once, and tells the server after that. Two users who accept
 * the same change at the same time then write its text two times.
 *
 * With `guard`, the editor asks the server first (`acceptGuard`): the
 * server gives the accept to the first request, and the editor writes only
 * then.
 */
export function sessionReviewOptions(
  sessionUrl: string,
  guard: boolean,
): Pick<DocumentAgentExtensionOptions, "onReview" | "onClose" | "acceptGuard"> {
  function post(path: string, body: unknown) {
    return fetch(`${sessionUrl}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  return {
    onReview: (batch) => void post("batches", { batch }),
    onClose: (result) => void post("close", { result }),
    ...(guard && {
      // The claim: the batch of the accept must follow the proposal of the
      // server, and a close must be for the state that this editor has.
      // The server answers 409 if another editor was first. Then this
      // editor gets a notice, and takes the session of the server.
      acceptGuard: async (claim) => {
        const response =
          claim.type === "tool-call"
            ? await post("batches", { batch: claim.batch })
            : await post("close", {
                result: "accepted",
                batches: claim.proposal.batches.length,
              });
        return response.ok;
      },
    }),
  };
}

/**
 * Keeps the editor in agreement with the session of the server. At the
 * start, and after each notice of the server (`notice` changes), the editor
 * gets the session:
 *
 * - The chat of the server becomes the chat of the editor.
 * - If a run is in progress, the editor follows it: a run of another
 *   editor, or a run that a caller outside the editors started.
 * - Else, if the document has an open proposal, the editor shows it.
 */
export function useSession(
  editor: BlockNoteEditor<any, any, any>,
  sessionUrl: string,
  notice: number,
) {
  const agent = useExtension(DocumentAgentExtension, { editor });

  const sync = useCallback(async () => {
    const response = await fetch(sessionUrl);
    if (!response.ok || agent.store.state.status === "running") {
      // The stream of a run that this editor follows has all the news.
      return;
    }
    const session = (await response.json()) as SessionSnapshot;
    if (session.proposal === undefined && session.activeRunId === undefined) {
      // Another editor closed the proposal: this editor has no decision.
      agent.dismiss();
    }
    agent.getChat().messages = session.messages;
    if (session.activeRunId !== undefined) {
      await agent.follow();
    } else if (
      session.proposal !== undefined &&
      session.proposal.batches.length > 0
    ) {
      agent.openProposal(session.proposal);
    }
  }, [agent, sessionUrl]);

  useEffect(() => {
    void sync();
  }, [sync, notice]);
}

/**
 * Keeps the chat of the editor in agreement with the session of the
 * server, for a document in Yjs 14 mode. The changes of the agent and the
 * decisions of the users come through the Yjs connection, not through the
 * session. Thus the editor gets only the chat here, and follows a run in
 * progress for its messages.
 */
export function useSuggestionSession(
  editor: BlockNoteEditor<any, any, any>,
  sessionUrl: string,
  notice: number,
) {
  const sync = useCallback(async () => {
    const agent = documentAgentOf(editor);
    const response = await fetch(sessionUrl);
    if (
      agent === undefined ||
      !response.ok ||
      agent.getState().status === "running"
    ) {
      // The stream of a run that this editor follows has all the news.
      return;
    }
    const session = (await response.json()) as {
      messages: SessionSnapshot["messages"];
      activeRunId?: string;
    };
    agent.getChat().messages = session.messages;
    if (session.activeRunId !== undefined) {
      await agent.follow();
    }
  }, [editor, sessionUrl]);

  useEffect(() => {
    void sync();
  }, [sync, notice]);
}

/**
 * Counts the notices of the session of a document in Yjs 14 mode: the
 * server writes them into a type of the suggestion document.
 */
export function useYjs14Notices(suggestion: Y14.Doc): number {
  const [notice, setNotice] = useState(0);
  const notices = useMemo(
    () => suggestion.get("document-agent-session"),
    [suggestion],
  );
  useEffect(() => {
    function onChange() {
      setNotice((count) => count + 1);
    }
    notices.observe(onChange);
    return () => notices.unobserve(onChange);
  }, [notices]);
  return notice;
}

/**
 * Ends a review that has nothing to review: a run that made no change (for
 * example an answer to a question). Else, the editor stays locked.
 */
export function useCloseEmptyReview(editor: BlockNoteEditor<any, any, any>) {
  const agent = useExtension(DocumentAgentExtension, { editor });
  const empty = useExtensionState(DocumentAgentExtension, {
    editor,
    selector: (state) =>
      state.status === "reviewing" &&
      state.review.suggestionCount === 0 &&
      state.review.toolCalls.every((call) => call.state !== "open"),
  });
  useEffect(() => {
    if (empty) {
      agent.rejectAll();
    }
  }, [agent, empty]);
}

/**
 * The JSON store: saves the document of the editor to the server, and
 * counts the notices of its session (server-sent events).
 */
export function useJsonStore(
  editor: BlockNoteEditor<any, any, any>,
  agentUrl: string,
  documentId: string,
): number {
  const agent = useExtension(DocumentAgentExtension, { editor });
  const [notice, setNotice] = useState(0);

  useEffect(() => {
    // `mainDocument()` is the document without the suggestions of a
    // proposal. It is safe to save in each state: `editor.document` is not.
    // The editor gives a change only for a change of the main document
    // (an edit of the user, or an accept), not for the display.
    function save() {
      void fetch(`${agentUrl}/documents/${documentId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(agent.mainDocument()),
      });
    }
    save();
    return editor.onChange(save);
  }, [agent, agentUrl, documentId, editor]);

  useEffect(() => {
    const events = new EventSource(
      `${agentUrl}/documents/${documentId}/events`,
    );
    events.addEventListener("session", () => setNotice((count) => count + 1));
    return () => events.close();
  }, [agentUrl, documentId]);

  return notice;
}

/** Counts the notices of the session of a Y.Doc: the server writes them into a map of the Y.Doc. */
export function useYjsNotices(doc: Y.Doc): number {
  const [notice, setNotice] = useState(0);
  const notices = useMemo(() => doc.getMap("document-agent-proposals"), [doc]);
  useEffect(() => {
    function onChange(event: Y.YMapEvent<unknown>) {
      if (event.keysChanged.has("session")) {
        setNotice((count) => count + 1);
      }
    }
    notices.observe(onChange);
    return () => notices.unobserve(onChange);
  }, [notices]);
  return notice;
}
