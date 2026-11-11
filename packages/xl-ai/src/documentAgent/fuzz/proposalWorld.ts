import { BlockNoteEditor } from "@blocknote/core";
import { withCollaboration, yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import * as Y from "yjs";

import { AIExtension } from "../../AIExtension.js";
import { getDocumentText, markdownFormat } from "../../api/v2/index.js";
import { DocumentAgentExtension } from "../client/DocumentAgentExtension.js";
import { hasSuggestions } from "../client/suggestions.js";
import { headlessEditorFactory, openProposal } from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";
import { createSessionHost } from "../sessions/sessionHost.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { yFragmentHasSuggestions } from "../stores/yjsGuard.js";
import { scriptedModel } from "../testUtil.js";
import {
  differenceOf,
  type FuzzClient,
  type Problem,
  type World,
  type WorldContext,
} from "./scenario.js";

// The proposal mode of the document agent for a scenario (see
// `scenario.ts`): a shared Yjs 13 document, a session host that keeps the
// proposal, and editors with `DocumentAgentExtension`.

const createEditor = headlessEditorFactory();

type ProposalClient = FuzzClient & {
  doc: Y.Doc;
  agent: ReturnType<typeof agentOf>;
  /** The requests of this editor to the host that did not arrive yet. */
  pending: (() => Promise<void>)[];
  /** The number of accepts that wait for the answer of the host. */
  claims: number;
  /** What the scenario wants to do when the host gives the next accept. */
  onAccept: (() => void) | undefined;
};

function agentOf(editor: BlockNoteEditor<any, any, any>) {
  return editor.getExtension(DocumentAgentExtension)!;
}

export type ProposalWorldOptions = {
  /** An accept asks the host first (`acceptGuard`). */
  guard: boolean;
};

export function createProposalWorld(
  context: WorldContext,
  options: ProposalWorldOptions,
): World {
  const stats = { rebases: 0, refusedAccepts: 0 };
  const mounted: BlockNoteEditor<any, any, any>[] = [];

  // ---- The server: the Y.Doc of the collaboration server, and the host.
  const serverDoc = new Y.Doc();
  const serverFragment = serverDoc.getXmlFragment("doc");
  const schemaEditor = BlockNoteEditor.create();
  const proposals = createInMemoryProposalStore();
  /** The last proposal that the store got: the model reads it. */
  let latest: Proposal | undefined;
  proposals.subscribe((_id, proposal) => {
    latest = proposal;
    if (proposal.batches.at(-1)?.source.type === "rebase") {
      stats.rebases++;
    }
  });
  const host = createSessionHost({
    model: scriptedModel(
      Array.from({ length: 400 }, () => () => context.agentStep()),
    ).model,
    createEditor,
    proposals,
    // The host reads the main document from the Y.Doc of the server.
    readMain: async () => yXmlFragmentToBlocks(schemaEditor, serverFragment),
    onRunError(_documentId, error) {
      context.problem({
        rule: "no-exception",
        detail: `run: ${String(error)}`,
      });
    },
  });

  // ---- The editors.
  const clients: ProposalClient[] = [];
  function createClient(name: string, state?: Uint8Array): ProposalClient {
    const doc = new Y.Doc();
    if (state !== undefined) {
      Y.applyUpdate(doc, state);
    }
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: doc.getXmlFragment("doc"),
          user: { name, color: "#ff0000" },
          provider: undefined,
        },
        trailingBlock: false,
        extensions: [
          AIExtension(),
          DocumentAgentExtension({
            aiMenu: false,
            // The base scenario: the editor writes at once, and tells the
            // host after that. The request arrives later.
            onReview(batch) {
              client.pending.push(async () => {
                await host.review("doc", batch);
              });
            },
            onClose(result) {
              client.pending.push(async () => {
                await host.closeProposal("doc", result);
              });
            },
            ...(options.guard && {
              acceptGuard: (claim) =>
                new Promise<boolean>((resolve) => {
                  const { onAccept } = client;
                  client.onAccept = undefined;
                  client.claims++;
                  client.pending.push(async () => {
                    const answer =
                      claim.type === "tool-call"
                        ? await host.review("doc", claim.batch)
                        : await host.closeProposal(
                            "doc",
                            "accepted",
                            claim.proposal.batches.length,
                          );
                    const granted = answer.error === undefined;
                    if (granted) {
                      onAccept?.();
                    } else {
                      stats.refusedAccepts++;
                    }
                    client.claims--;
                    resolve(granted);
                  });
                }),
            }),
          }),
        ],
      }),
    );
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    const client: ProposalClient = {
      name,
      doc,
      editor,
      agent: agentOf(editor),
      pending: [],
      claims: 0,
      onAccept: undefined,
    };
    clients.push(client);
    return client;
  }

  // The first editor makes the document. The other editors get it.
  const first = createClient("editor-0");
  first.editor.replaceBlocks(first.editor.document, context.blocks);
  Y.applyUpdate(serverDoc, Y.encodeStateAsUpdate(first.doc));
  createClient("editor-1", Y.encodeStateAsUpdate(serverDoc));
  createClient("editor-2", Y.encodeStateAsUpdate(serverDoc));

  function own(client: FuzzClient): ProposalClient {
    const found = clients.find((item) => item === client);
    if (found === undefined) {
      throw new Error("The client is not of this world");
    }
    return found;
  }

  /** Runs an accept of the editor: with a guard, the scenario records it when the host gives it. */
  function accept(
    client: ProposalClient,
    onAccept: () => void,
    run: () => void,
  ) {
    if (options.guard) {
      client.onAccept = onAccept;
    } else {
      onAccept();
    }
    run();
    // An accept that did not ask the host (for example for a tool call
    // that the proposal does not have) records nothing.
    client.onAccept = undefined;
  }

  async function deliver(client: FuzzClient) {
    const request = own(client).pending.shift();
    if (request !== undefined) {
      await request();
      // The editor continues after the answer of the host.
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  function documentOfDoc(doc: Y.Doc) {
    return yXmlFragmentToBlocks(schemaEditor, doc.getXmlFragment("doc"));
  }

  return {
    clients,
    reviewers: clients.slice(0, context.reviewers),

    sync(client) {
      const { doc } = own(client);
      const fromClient = Y.encodeStateAsUpdate(doc);
      const fromServer = Y.encodeStateAsUpdate(serverDoc);
      Y.applyUpdate(serverDoc, fromClient);
      Y.applyUpdate(doc, fromServer);
      if (yFragmentHasSuggestions(serverFragment)) {
        context.problem({
          rule: "no-suggestion-in-shared-document",
          detail: `after a sync of ${client.name}`,
        });
      }
    },
    deliver,
    async deliverAll() {
      while (clients.some((client) => client.pending.length > 0)) {
        for (const client of clients) {
          await deliver(client);
        }
      }
    },

    // A user changes the document in an editor that shows no proposal.
    canEdit: (client) => own(client).agent.store.state.status === "idle",
    // The editor shows the main document then. It can have its own IDs for
    // two blocks with one ID in the Y.Doc (a known failure of this mode).
    blocksForEdit: (client) => own(client).editor.document,
    mainOf: (client) => documentOfDoc(own(client).doc),
    sharedMain: () => documentOfDoc(serverDoc),

    agentText() {
      if (latest === undefined) {
        return undefined;
      }
      const { editor } = openProposal(createEditor, latest);
      return {
        version: `v${latest.batches.length}`,
        markdown: getDocumentText(editor, markdownFormat),
      };
    },
    earlierAgentText(random) {
      if (latest === undefined || latest.batches.length === 0) {
        return undefined;
      }
      const version = random.int(latest.batches.length);
      const blocks = openProposal(createEditor, latest, [version]).versions.get(
        version,
      );
      return blocks === undefined
        ? undefined
        : {
            version: `v${version}`,
            markdown: getDocumentText(createEditor(blocks), markdownFormat),
          };
    },
    async runAgent() {
      const started = await host.startRun("doc", {
        prompt: "Edit the document.",
        origin: "external",
      });
      if (started.error === undefined) {
        await started.run.done.catch(() => undefined);
      }
    },

    /** What the app does after a notice of the host: the editor takes the session. */
    async refresh(client) {
      const { agent } = own(client);
      const snapshot = await host.snapshot("doc");
      if (snapshot.proposal === undefined) {
        agent.dismiss();
      } else if (snapshot.proposal.batches.length > 0) {
        agent.openProposal(snapshot.proposal);
      }
      const state = agent.store.state;
      if (state.status === "error") {
        context.problem({
          rule: "editor-in-sync",
          detail: `${client.name}: ${state.error}`,
        });
      }
    },
    isBusy: (client) => own(client).claims > 0,
    openToolCalls(client) {
      const state = own(client).agent.store.state;
      return state.status === "reviewing"
        ? state.review.toolCalls
            .filter((call) => call.state === "open")
            .map((call) => call.toolCallId)
        : [];
    },
    acceptToolCall(client, toolCallId, onAccept) {
      const target = own(client);
      accept(target, onAccept, () => target.agent.acceptToolCall(toolCallId));
    },
    rejectToolCall: (client, toolCallId) =>
      own(client).agent.rejectToolCall(toolCallId),
    acceptAll(client, onAccept) {
      const target = own(client);
      accept(target, onAccept, () => target.agent.acceptAll());
    },
    rejectAll: (client) => own(client).agent.rejectAll(),
    reviewEnded: async () =>
      (await host.snapshot("doc")).proposal === undefined,

    problemsAtEnd() {
      const found: Problem[] = [];
      for (const client of clients) {
        // The review ended, and the editor has no suggestion mark.
        if (client.agent.store.state.status !== "idle") {
          found.push({ rule: "review-ends", detail: client.name });
        }
        if (hasSuggestions(client.editor.prosemirrorState.doc)) {
          found.push({ rule: "no-suggestion-in-editor", detail: client.name });
        }
        // The editor shows its Y.Doc.
        const ofDoc = documentOfDoc(client.doc);
        if (JSON.stringify(client.editor.document) !== JSON.stringify(ofDoc)) {
          found.push({
            rule: "editor-shows-its-document",
            detail: `${client.name}: ${differenceOf(client.editor.document, ofDoc)}`,
          });
        }
      }
      if (yFragmentHasSuggestions(serverFragment)) {
        found.push({ rule: "no-suggestion-in-shared-document", detail: "end" });
      }
      return found;
    },
    stats: () => stats,
    destroy() {
      while (mounted.length) {
        mounted.pop()?._tiptapEditor.destroy();
      }
    },
  };
}
