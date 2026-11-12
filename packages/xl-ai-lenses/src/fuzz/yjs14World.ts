import { BlockNoteEditor } from "@blocknote/core";
import { yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";

import { runDocumentAgent } from "../agent/documentAgent.js";
import { scriptedModel } from "../testUtil.js";
import type { AgentDocument, OpenDocument } from "../tools/agentDocument.js";
import {
  createSuggestionDocument,
  keepSuggestionCurrent,
} from "../yjs14/suggestionDocument.js";
import {
  createSuggestionClient,
  FRAGMENT,
  mainDocumentOf,
  type SuggestionClient,
  suggestionMarksOf,
  suggestionReplicaOf,
  syncDocs,
} from "../yjs14/testUtil.js";
import {
  type AgentText,
  differenceOf,
  type FuzzClient,
  type Problem,
  RuleError,
  type World,
  type WorldContext,
} from "./scenario.js";

// The Yjs 14 mode of the document agent for a scenario (see
// `scenario.ts`): a main document (M) and a suggestion document (S) on the
// server, and users with a replica of the two and an editor that shows the
// suggestions. There is no host for the review: a decision of a user is a
// change of the two Y.Docs.

type Yjs14Client = FuzzClient & { user: SuggestionClient };

const schemaEditor = BlockNoteEditor.create();

/**
 * Returns the document with a record of each text that the agent got: the
 * mock model of a scenario writes from these texts.
 */
function recordTexts(inner: AgentDocument, texts: AgentText[]): AgentDocument {
  function record(open: OpenDocument, version: string) {
    texts.push({ version, markdown: open.markdown() });
  }
  return {
    noStep: inner.noStep,
    step: (run) =>
      inner.step((open) => {
        record(open, open.version);
        return run({
          ...open,
          write(change, toolCall) {
            const written = open.write(change, toolCall);
            if (written.error === undefined && written.changed) {
              record(open, written.version);
            }
            return written;
          },
        });
      }),
  };
}

export function createYjs14World(context: WorldContext): World {
  const stats = { pendingInMain: 0 };

  // ---- The server: the two documents.
  const serverMain = mainDocumentOf(context.blocks);
  const serverSuggestion = suggestionReplicaOf(serverMain);
  const stopForward = keepSuggestionCurrent(serverMain, serverSuggestion);
  const { model } = scriptedModel(
    Array.from({ length: 400 }, () => () => context.agentStep()),
  );
  /** The texts that the agent got in the run in progress. */
  let agentTexts: AgentText[] = [];

  // ---- The users.
  const clients: Yjs14Client[] = ["editor-0", "editor-1", "editor-2"].map(
    (name) => {
      const user = createSuggestionClient(serverMain, serverSuggestion);
      return { name, editor: user.editor, user };
    },
  );

  function own(client: FuzzClient): Yjs14Client {
    const found = clients.find((item) => item === client);
    if (found === undefined) {
      throw new Error("The client is not of this world");
    }
    return found;
  }

  function mainOf(doc: Y.Doc) {
    return yDocToBlocks(schemaEditor, doc, FRAGMENT);
  }

  /**
   * Runs a decision of a reviewer. A decision changes the Y.Docs, and the
   * editor of the reviewer shows the change in the same call: an exception
   * of the editor comes out of the decision.
   */
  function decide(run: () => unknown): void {
    try {
      run();
    } catch (error) {
      throw new RuleError("no-exception-in-review", error);
    }
  }

  function openOf(client: Yjs14Client): string[] {
    return client.user.review
      .toolCalls()
      .filter((call) => call.state === "open")
      .map((call) => call.toolCallId);
  }

  return {
    clients,
    reviewers: clients.slice(0, context.reviewers),

    sync(client) {
      const { user } = own(client);
      syncDocs(user.main, serverMain);
      syncDocs(user.suggestion, serverSuggestion);
      // The server got changes of the main document: the user gets them in
      // the suggestion document also.
      syncDocs(user.suggestion, serverSuggestion);
    },
    // A decision of a user is a change of its Y.Docs: no request waits.
    deliver: async () => undefined,
    deliverAll: async () => undefined,

    // A user changes the document at each time, also during a review.
    canEdit: () => true,
    blocksForEdit: (client) => mainOf(own(client).user.main),
    mainOf: (client) => mainOf(own(client).user.main),
    sharedMain: () => mainOf(serverMain),

    agentText: () => agentTexts.at(-1),
    earlierAgentText: (random) =>
      agentTexts.length < 2
        ? undefined
        : agentTexts[random.int(agentTexts.length - 1)],
    async runAgent() {
      agentTexts = [];
      const document = createSuggestionDocument({
        suggestion: serverSuggestion,
        fragment: FRAGMENT,
      });
      try {
        await runDocumentAgent(
          recordTexts(document, agentTexts),
          "Edit the document.",
          { model },
        );
      } catch (error) {
        context.problem({
          rule: "no-exception",
          detail: `run: ${String(error)}`,
        });
      } finally {
        document.destroy();
      }
    },

    // Each editor shows the suggestions of its replica at each time.
    refresh: async () => undefined,
    isBusy: () => false,
    openToolCalls: (client) => openOf(own(client)),
    acceptToolCall(client, toolCallId, onAccept) {
      onAccept();
      decide(() => own(client).user.review.acceptToolCall(toolCallId));
    },
    rejectToolCall: (client, toolCallId) =>
      decide(() => own(client).user.review.rejectToolCall(toolCallId)),
    acceptAll(client, onAccept) {
      onAccept();
      decide(() => own(client).user.review.acceptAll());
    },
    rejectAll: (client) => decide(() => own(client).user.review.rejectAll()),
    reviewEnded: async () =>
      clients.every((client) => openOf(client).length === 0),

    problemsAtEnd() {
      const found: Problem[] = [];
      for (const client of clients) {
        // The review ended, and the editor has no suggestion mark.
        if (openOf(client).length > 0) {
          found.push({ rule: "review-ends", detail: client.name });
        }
        const marks = suggestionMarksOf(client.editor.prosemirrorState.doc);
        if (marks.length > 0) {
          found.push({
            rule: "no-suggestion-in-editor",
            detail: `${client.name}: ${marks.slice(0, 4).join("; ")}`,
          });
        }
        // The editor shows the main document.
        const main = mainOf(client.user.main);
        if (JSON.stringify(client.editor.document) !== JSON.stringify(main)) {
          found.push({
            rule: "editor-shows-its-document",
            detail: `${client.name}: ${differenceOf(client.editor.document, main)}`,
          });
        }
      }
      return found;
    },
    stats: () => stats,
    destroy() {
      stopForward();
      for (const client of clients) {
        client.user.destroy();
      }
    },
  };
}
