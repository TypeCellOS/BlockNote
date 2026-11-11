import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { withCollaboration, yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import { writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { AIExtension } from "../../AIExtension.js";
import { getDocumentText, markdownFormat } from "../../api/v2/index.js";
import { createRandom } from "../../api/v2/testUtil/random.js";
import {
  type AcceptClaim,
  DocumentAgentExtension,
} from "../client/DocumentAgentExtension.js";
import { hasSuggestions } from "../client/suggestions.js";
import { toolCallsOf } from "../proposal/derive.js";
import { headlessEditorFactory, openProposal } from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { yFragmentHasSuggestions } from "../stores/yjsGuard.js";
import { scriptedModel, type ScriptedStep, textOf } from "../testUtil.js";
import { createSessionHost } from "./sessionHost.js";

// A test with random concurrent edits for a session on a shared Yjs
// document. Each seed is one scenario:
//
// - Three editors, each with its own Y.Doc, and the Y.Doc of a server. An
//   editor and the server exchange their updates at random times: this is
//   the network.
// - A session host with a mock model. A run makes one to three random tool
//   calls. Each change of the agent has a marker word (`AX<n>Z`).
// - Users change the document in an editor that shows no proposal, also
//   while the agent works. Each change of a user has a marker word
//   (`UX<n>Z`).
// - One or two reviewers get the proposal of the host, and accept or reject
//   one tool call or the full proposal. In a variant with a delay, their
//   requests to the host arrive at random later times, and a reviewer can
//   have an old proposal.
//
// At the end, all requests arrive, all editors sync, and a reviewer accepts
// what is open. Then the test examines the rules of `problemsOf`.
//
// The variants are the accept guard (on or off), the number of reviewers,
// and the delay. A variant has a list of the rules that it is known to
// break: see `KNOWN_WITHOUT_GUARD`. A variant with a guard, and a variant
// without a delay, have no such rule.
//
// The number of seeds for each variant is small in a normal test run. Set
// DOCUMENT_AGENT_FUZZ_SEEDS for more, DOCUMENT_AGENT_FUZZ_START for the
// first seed, and DOCUMENT_AGENT_FUZZ_REPORT for a file with each problem.

const SEEDS = Number(process.env.DOCUMENT_AGENT_FUZZ_SEEDS ?? 5);
const START = Number(process.env.DOCUMENT_AGENT_FUZZ_START ?? 1);
const ACTIONS = 60;
/** The kinds of a review action: 0 accept all, 1 reject all, 2 accept one, 3 reject one. */
const REVIEW_KINDS = [0, 0, 1, 2, 2, 2, 3, 3];

type Variant = {
  name: string;
  /** The number of editors that review the proposal (of three editors). */
  reviewers: 1 | 2;
  /** An accept asks the host first (`acceptGuard`). */
  guard: boolean;
  /**
   * The requests of a reviewer to the host arrive at a random later time,
   * and a reviewer takes the proposal of the host at random times. Without
   * a delay, each request arrives before the next action, and each
   * reviewer has the newest proposal after each change of it.
   */
  delay: boolean;
  /**
   * A user can replace a word in the middle of a block. Then a change of
   * the agent to the same word is in conflict, and the change of the user
   * stays: a marker word of the agent can be missing.
   */
  wordConflicts: boolean;
};

const createEditor = headlessEditorFactory();

/** Sentences with different words, for the document at the start. */
const SENTENCES = [
  "Maintainers review each change before they merge it.",
  "A license tells people what they can do with the code.",
  "Tests run automatically after every commit.",
  "Good documentation helps new users to start quickly.",
  "A release has a version number and a list of changes.",
  "Security problems are reported in private first.",
  "Volunteers translate the texts into many languages.",
  "Sponsors pay for the work of some developers.",
];

// jsdom has no layout: it does not have `scrollIntoView`.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

const mounted: BlockNoteEditor<any, any, any>[] = [];
afterEach(() => {
  while (mounted.length) {
    mounted.pop()?._tiptapEditor.destroy();
  }
});

function agentOf(editor: BlockNoteEditor<any, any, any>) {
  return editor.getExtension(DocumentAgentExtension)!;
}

/** The blocks that only one of two documents has, as text. */
type TextBlock = { id: string; content?: unknown };
function differenceOf(
  a: readonly TextBlock[],
  b: readonly TextBlock[],
): string {
  const inA = new Set(a.map((block) => JSON.stringify(block)));
  const inB = new Set(b.map((block) => JSON.stringify(block)));
  function only(
    blocks: readonly TextBlock[],
    other: ReadonlySet<string>,
  ): string {
    return blocks
      .filter((block) => !other.has(JSON.stringify(block)))
      .map((block) => `${block.id.slice(0, 6)} "${textOf(block)}"`)
      .join(", ");
  }
  return `only the first: [${only(a, inB)}], only the second: [${only(b, inA)}], blocks: ${a.length} and ${b.length}`;
}

/** One problem of a scenario: a broken rule, with a short detail. */
type Problem = { rule: string; detail: string };

/** Runs one scenario, and returns its problems and the log of its actions. */
async function runScenario(seed: number, variant: Variant) {
  const random = createRandom(seed);
  const log: string[] = [];
  const problems: Problem[] = [];
  /** What the scenario did: a scenario that does nothing breaks no rule. */
  const stats = {
    userEdits: 0,
    toolCallBatches: 0,
    rebases: 0,
    accepts: 0,
    refusedAccepts: 0,
    rejects: 0,
  };
  let tokens = 0;
  function nextToken(kind: "A" | "U"): string {
    return `${kind}X${++tokens}Z`;
  }

  // ---- The server: the Y.Doc of the collaboration server, and the host.
  const serverDoc = new Y.Doc();
  const serverFragment = serverDoc.getXmlFragment("doc");
  const schemaEditor = BlockNoteEditor.create();
  const proposals = createInMemoryProposalStore();
  /** The last proposal that the store got: the model reads it. */
  let latest: Proposal | undefined;
  proposals.subscribe((_id, proposal) => {
    latest = proposal;
    const last = proposal.batches.at(-1);
    if (last?.source.type === "tool-call") {
      stats.toolCallBatches++;
    } else if (last?.source.type === "rebase") {
      stats.rebases++;
    }
  });

  // ---- The editors.
  type Client = {
    name: string;
    doc: Y.Doc;
    editor: BlockNoteEditor<any, any, any>;
    agent: ReturnType<typeof agentOf>;
    /** The requests of this editor to the host that did not arrive yet. */
    pending: (() => Promise<void>)[];
    /** The number of accepts that wait for the answer of the host. */
    claims: number;
  };
  const clients: Client[] = [];
  /** The marker words of the changes that a reviewer accepted, with the number of accepts. */
  const accepted = new Map<string, number>();
  /** The marker words of the tool calls that a reviewer rejected. */
  const rejected = new Set<string>();
  /** The marker words of the tool calls of each accept of a reviewer. */
  const acceptedOnce = new Set<string>();
  const userTokens = new Set<string>();
  /** The marker word of each tool call of the agent. */
  const tokenOfCall = new Map<string, string>();

  /** The agent marker words in the proposal document, for the tool calls. */
  function tokensIn(proposal: Proposal, toolCallIds: readonly string[]) {
    const text = JSON.stringify(
      openProposal(createEditor, proposal).editor.document,
    );
    return toolCallIds
      .map((id) => tokenOfCall.get(id))
      .filter(
        (token): token is string => token !== undefined && text.includes(token),
      );
  }

  /**
   * Returns true if a different tool call of the proposal changed a block
   * of the tool call. A decision for one such call is a known limit (see
   * the tests "a block that two tool calls changed" of the review): the
   * rules for an accept and a reject of one call do not apply to it.
   */
  function sharesBlock(proposal: Proposal, toolCallId: string): boolean {
    const own = new Set<string>();
    const other = new Set<string>();
    for (const batch of proposal.batches) {
      if (batch.source.type === "tool-call") {
        const ids = batch.source.toolCallId === toolCallId ? own : other;
        batch.changedBlockIds.forEach((id) => ids.add(id));
      }
    }
    return [...own].some((id) => other.has(id));
  }

  /**
   * Records an accept of a reviewer for the rules.
   *
   * - The rule for a reject does not apply to a tool call that a reviewer
   *   accepted at some time: the accept wrote its change.
   * - The change of a call must stay in the document if the editor of the
   *   reviewer shows it (the editor does not show a change of the agent
   *   that is in conflict with the main document). For an accept of one
   *   call, the call must also be the only one that changed its blocks.
   */
  function recordAccept(
    client: Client,
    proposal: Proposal,
    toolCallIds: readonly string[],
    oneCall: boolean,
  ) {
    stats.accepts++;
    const shown = JSON.stringify(client.editor.document);
    for (const toolCallId of toolCallIds) {
      const partOfBlock = oneCall && sharesBlock(proposal, toolCallId);
      for (const token of tokensIn(proposal, [toolCallId])) {
        acceptedOnce.add(token);
        if (shown.includes(token) && !partOfBlock) {
          accepted.set(token, (accepted.get(token) ?? 0) + 1);
        }
      }
    }
  }

  /** The tool calls that an accept of the proposal accepts: those without a decision. */
  function openCalls(proposal: Proposal): string[] {
    return toolCallsOf(proposal)
      .filter((call) => call.state === "open")
      .map((call) => call.toolCallId);
  }

  /** Records the accept that the host gave to the claim of an accept guard. */
  function recordClaim(client: Client, claim: AcceptClaim) {
    if (claim.type === "proposal") {
      recordAccept(client, claim.proposal, openCalls(claim.proposal), false);
    } else if (claim.batch.source.type === "accept") {
      recordAccept(
        client,
        claim.proposal,
        [claim.batch.source.toolCallId],
        true,
      );
    }
  }

  function createClient(name: string, state?: Uint8Array): Client {
    const doc = new Y.Doc();
    if (state !== undefined) {
      Y.applyUpdate(doc, state);
    }
    const client: Client = {
      name,
      doc,
      pending: [],
      claims: 0,
      editor: undefined as never,
      agent: undefined as never,
    };
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
            ...(variant.guard && {
              acceptGuard: (claim) =>
                new Promise<boolean>((resolve) => {
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
                      recordClaim(client, claim);
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
    client.editor = editor;
    client.agent = agentOf(editor);
    clients.push(client);
    return client;
  }

  // The first editor makes the document. The other editors get it.
  const first = createClient("editor-0");
  const count = 4 + random.int(3);
  const sentences = [...SENTENCES].sort(() => random.int(3) - 1);
  first.editor.replaceBlocks(
    first.editor.document,
    sentences
      .slice(0, count)
      .map((content, index): PartialBlock =>
        index === 0
          ? { type: "heading", content }
          : index % 3 === 0
            ? { type: "bulletListItem", content }
            : { type: "paragraph", content },
      ),
  );
  Y.applyUpdate(serverDoc, Y.encodeStateAsUpdate(first.doc));
  createClient("editor-1", Y.encodeStateAsUpdate(serverDoc));
  createClient("editor-2", Y.encodeStateAsUpdate(serverDoc));
  const reviewers = clients.slice(0, variant.reviewers);

  // ---- The network.
  function sync(client: Client) {
    const fromClient = Y.encodeStateAsUpdate(client.doc);
    const fromServer = Y.encodeStateAsUpdate(serverDoc);
    Y.applyUpdate(serverDoc, fromClient);
    Y.applyUpdate(client.doc, fromServer);
    if (yFragmentHasSuggestions(serverFragment)) {
      problems.push({
        rule: "no-suggestion-in-shared-document",
        detail: `after a sync of ${client.name}`,
      });
    }
  }
  function syncAll() {
    // Two rounds: the second round gives each editor the updates that the
    // server got from the editors after it.
    for (let round = 0; round < 2; round++) {
      clients.forEach(sync);
    }
  }
  async function deliver(client: Client) {
    const request = client.pending.shift();
    if (request !== undefined) {
      await request();
      // The editor continues after the answer of the host.
      await new Promise((resolve) => setTimeout(resolve));
    }
  }
  async function deliverAll() {
    while (clients.some((client) => client.pending.length > 0)) {
      for (const client of clients) {
        await deliver(client);
      }
    }
  }
  /** Without a delay: all requests arrive, and each reviewer takes the session. */
  async function withoutDelay() {
    if (variant.delay) {
      return;
    }
    await deliverAll();
    for (const reviewer of reviewers) {
      await refresh(reviewer);
    }
  }

  // ---- The users.
  function userEdit() {
    const idle = clients.filter(
      (client) => client.agent.store.state.status === "idle",
    );
    if (idle.length === 0) {
      return;
    }
    const client = random.pick(idle);
    const blocks = client.editor.document;
    const block = random.pick(blocks);
    const token = nextToken("U");
    userTokens.add(token);
    stats.userEdits++;
    const text = textOf(block);
    const words = text.match(/[A-Za-z]{5,}/g) ?? [];
    const kind = random.int(variant.wordConflicts ? 3 : 2);
    if (kind === 0) {
      client.editor.insertBlocks(
        [{ type: "paragraph", content: `${token} paragraph.` }],
        block.id,
        "after",
      );
      log.push(`${client.name}: new paragraph ${token}`);
    } else if (kind === 1 || words.length === 0) {
      client.editor.updateBlock(block.id, { content: `${text} ${token}` });
      log.push(`${client.name}: append ${token}`);
    } else {
      const word = random.pick(words);
      client.editor.updateBlock(block.id, {
        content: text.replace(word, token),
      });
      log.push(`${client.name}: replace "${word}" with ${token}`);
    }
  }

  // ---- The agent: a mock model that makes random tool calls.
  let stepsLeft = 0;
  let calls = 0;
  function agentStep(): ScriptedStep {
    if (stepsLeft === 0) {
      return { text: "Done." };
    }
    stepsLeft--;
    // The users work, and the network moves, while the model writes.
    for (let k = random.int(3); k > 0; k--) {
      if (random.chance(0.5)) {
        userEdit();
      } else {
        sync(random.pick(clients));
      }
    }
    if (latest === undefined) {
      throw new Error("The run has no proposal");
    }
    const proposal = latest;
    const toolCallId = `call-${++calls}`;
    const token = nextToken("A");
    tokenOfCall.set(toolCallId, token);
    const reason = `Reason of ${toolCallId}`;
    // Sometimes the model writes from an older version of the proposal.
    const version =
      random.chance(0.2) && proposal.batches.length > 0
        ? random.int(proposal.batches.length)
        : proposal.batches.length;
    const { editor, versions } = openProposal(createEditor, proposal, [
      version,
    ]);
    const blocks = versions.get(version) ?? editor.document;
    const markdown = getDocumentText(createEditor(blocks), markdownFormat);
    const current = getDocumentText(editor, markdownFormat);
    const unique = (current.match(/[A-Za-z]{5,}/g) ?? []).filter(
      (word) => current.split(word).length === 2,
    );
    const kind = random.int(3);
    if (kind < 2 && unique.length > 0) {
      const word = random.pick(unique);
      log.push(
        `agent ${toolCallId}: ${kind === 0 ? "replace" : "append after"} "${word}" ${token}`,
      );
      return {
        toolCalls: [
          {
            toolName: "editText",
            input: {
              old: word,
              new: kind === 0 ? token : `${word} ${token}`,
              reason,
            },
          },
        ],
      };
    }
    const parts = markdown.trimEnd().split("\n\n");
    parts.splice(random.int(parts.length + 1), 0, `${token} sentence.`);
    log.push(`agent ${toolCallId}: new paragraph ${token}, base v${version}`);
    return {
      toolCalls: [
        {
          toolName: "writeDocument",
          input: {
            markdown: `${parts.join("\n\n")}\n`,
            base: `v${version}`,
            reason,
          },
        },
      ],
    };
  }
  const host = createSessionHost({
    model: scriptedModel(Array.from({ length: 400 }, () => agentStep)).model,
    createEditor,
    proposals,
    // The host reads the main document from the Y.Doc of the server.
    readMain: async () => yXmlFragmentToBlocks(schemaEditor, serverFragment),
    onRunError(_documentId, error) {
      problems.push({ rule: "no-exception", detail: `run: ${String(error)}` });
    },
  });
  async function agentRun() {
    stepsLeft = 1 + random.int(3);
    log.push("agent: run");
    const started = await host.startRun("doc", {
      prompt: "Edit the document.",
      origin: "external",
    });
    if (started.error === undefined) {
      await started.run.done.catch(() => undefined);
    }
  }

  // ---- The reviewers.
  /** What the app does after a notice of the host: the editor takes the session. */
  async function refresh(client: Client) {
    if (client.claims > 0) {
      return;
    }
    const snapshot = await host.snapshot("doc");
    if (snapshot.proposal === undefined) {
      client.agent.dismiss();
    } else if (snapshot.proposal.batches.length > 0) {
      client.agent.openProposal(snapshot.proposal);
    }
    const state = client.agent.store.state;
    if (state.status === "error") {
      problems.push({
        rule: "editor-in-sync",
        detail: `${client.name}: ${state.error}`,
      });
    }
  }
  function review(client: Client, kind = random.pick(REVIEW_KINDS)) {
    const state = client.agent.store.state;
    if (state.status !== "reviewing" || client.claims > 0) {
      return;
    }
    const { proposal } = state.review;
    const open = state.review.toolCalls.filter((call) => call.state === "open");
    const call = open.length > 0 ? random.pick(open) : undefined;
    if (kind === 0) {
      log.push(`${client.name}: accept all`);
      if (!variant.guard) {
        recordAccept(client, proposal, openCalls(proposal), false);
      }
      client.agent.acceptAll();
    } else if (kind === 1) {
      stats.rejects++;
      log.push(`${client.name}: reject all`);
      for (const token of tokensIn(
        proposal,
        open.map((item) => item.toolCallId),
      )) {
        rejected.add(token);
      }
      client.agent.rejectAll();
    } else if (call !== undefined && kind === 2) {
      log.push(`${client.name}: accept ${call.toolCallId}`);
      if (!variant.guard) {
        recordAccept(client, proposal, [call.toolCallId], true);
      }
      client.agent.acceptToolCall(call.toolCallId);
    } else if (call !== undefined) {
      stats.rejects++;
      log.push(`${client.name}: reject ${call.toolCallId}`);
      if (!sharesBlock(proposal, call.toolCallId)) {
        for (const token of tokensIn(proposal, [call.toolCallId])) {
          rejected.add(token);
        }
      }
      client.agent.rejectToolCall(call.toolCallId);
    }
  }

  // ---- The scenario.
  try {
    for (let action = 0; action < ACTIONS; action++) {
      const kind = random.int(100);
      if (kind < 18) {
        userEdit();
      } else if (kind < 36) {
        sync(random.pick(clients));
      } else if (kind < 46) {
        await agentRun();
        await withoutDelay();
      } else if (kind < 66) {
        await refresh(random.pick(reviewers));
      } else if (kind < 88) {
        review(random.pick(reviewers));
        await withoutDelay();
      } else {
        await deliver(random.pick(clients));
      }
    }

    // The end: all requests arrive, all editors sync, and the first
    // reviewer accepts what is open.
    await deliverAll();
    syncAll();
    for (let attempt = 0; attempt < 6; attempt++) {
      if ((await host.snapshot("doc")).proposal === undefined) {
        break;
      }
      await refresh(reviewers[0]);
      review(reviewers[0], 0);
      await deliverAll();
      syncAll();
    }
    for (const client of clients) {
      await refresh(client);
    }
    await deliverAll();
    syncAll();
    problems.push(...problemsOf());
  } catch (error) {
    problems.push({ rule: "no-exception", detail: String(error) });
  }

  /** Examines the rules at the end of a scenario. */
  function problemsOf(): Problem[] {
    const found: Problem[] = [];
    const main = JSON.stringify(first.editor.document);
    function countOf(token: string) {
      return main.split(token).length - 1;
    }
    // 1. Each editor has no review, and no suggestion mark.
    for (const client of clients) {
      if (client.agent.store.state.status !== "idle") {
        found.push({ rule: "review-ends", detail: client.name });
      }
      if (hasSuggestions(client.editor.prosemirrorState.doc)) {
        found.push({ rule: "no-suggestion-in-editor", detail: client.name });
      }
    }
    // 2. Each editor shows its Y.Doc, and each Y.Doc is the same as the
    // Y.Doc of the server.
    const shared = yXmlFragmentToBlocks(schemaEditor, serverFragment);
    for (const client of clients) {
      const ofDoc = yXmlFragmentToBlocks(
        schemaEditor,
        client.doc.getXmlFragment("doc"),
      );
      if (JSON.stringify(client.editor.document) !== JSON.stringify(ofDoc)) {
        found.push({
          rule: "editor-shows-its-document",
          detail: `${client.name}: ${differenceOf(client.editor.document, ofDoc)}`,
        });
      }
      if (JSON.stringify(ofDoc) !== JSON.stringify(shared)) {
        found.push({
          rule: "editors-agree",
          detail: `${client.name}: ${differenceOf(ofDoc, shared)}`,
        });
      }
    }
    if (yFragmentHasSuggestions(serverFragment)) {
      found.push({ rule: "no-suggestion-in-shared-document", detail: "end" });
    }
    // 3. No block ID is in the shared document two times. An editor gives
    // new IDs to such blocks, but only in its own view (see rule 2).
    const ids = shared.map((block) => block.id);
    const twice = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (twice.length > 0) {
      found.push({ rule: "block-ids-different", detail: twice.join(",") });
    }
    // 4. No change of a user is lost, and none is there two times.
    for (const token of userTokens) {
      if (countOf(token) !== 1) {
        found.push({
          rule: countOf(token) === 0 ? "user-change-stays" : "no-text-twice",
          detail: `${token} x${countOf(token)}`,
        });
      }
    }
    // 5. No change of the agent is there two times. An accepted change is
    // there one time, and a rejected change is not there. The last two
    // rules need a scenario without conflicts between a user and the agent,
    // and the rule for a reject needs one reviewer. They apply to the
    // decisions that `recordAccept` and `review` record.
    for (const token of tokenOfCall.values()) {
      const times = countOf(token);
      if (times > 1) {
        found.push({ rule: "no-text-twice", detail: `${token} x${times}` });
      } else if (variant.wordConflicts) {
        continue;
      } else if (accepted.has(token) && times === 0) {
        found.push({ rule: "accepted-change-stays", detail: token });
      } else if (
        variant.reviewers === 1 &&
        rejected.has(token) &&
        !acceptedOnce.has(token) &&
        times === 1
      ) {
        found.push({ rule: "rejected-change-goes", detail: token });
      }
    }
    return found;
  }

  return { problems, log, stats };
}

/**
 * The rules that the base scenario (an accept without a guard) is known to
 * break if the requests to the host have a delay. An accept is a write of
 * the editor to the document, and a message to the host. The two are not
 * in one order:
 *
 * - A run can start before the host has the message. Its rebase finds the
 *   accepted change in the main document and in the proposal, and the
 *   proposal gets a new paragraph two times.
 * - The host shows an accepted tool call as open, and the reviewer can
 *   reject it after that.
 *
 * With `acceptGuard`, the host has the accept before the editor writes.
 */
const KNOWN_WITHOUT_GUARD = ["no-text-twice", "accepted-change-stays"];

/**
 * The rules that two reviewers without a guard are known to break, more
 * than {@link KNOWN_WITHOUT_GUARD}: the two can accept the same change (see
 * the tests "KNOWN: two users who accept ..." of the extension). For a new
 * block, each accept inserts a block with the ID of the proposal:
 *
 * - The shared document has that block ID two times.
 * - Each editor gives new IDs to the two blocks in its own view. The new
 *   IDs go to the shared document only with the next change of that user.
 *   Until then, the editors do not agree on the IDs of these blocks.
 */
const KNOWN_WITHOUT_GUARD_TWO_REVIEWERS = [
  ...KNOWN_WITHOUT_GUARD,
  "block-ids-different",
  "editor-shows-its-document",
];

const VARIANTS: (Variant & { known: string[] })[] = [
  {
    name: "one reviewer, with the accept guard",
    reviewers: 1,
    guard: true,
    delay: true,
    wordConflicts: false,
    known: [],
  },
  {
    name: "two reviewers, with the accept guard",
    reviewers: 2,
    guard: true,
    delay: true,
    wordConflicts: false,
    known: [],
  },
  {
    name: "two reviewers, with the accept guard, conflicts between a user and the agent",
    reviewers: 2,
    guard: true,
    delay: true,
    wordConflicts: true,
    known: [],
  },
  {
    name: "one reviewer, no guard, no delay",
    reviewers: 1,
    guard: false,
    delay: false,
    wordConflicts: false,
    known: [],
  },
  {
    name: "two reviewers, no guard, no delay",
    reviewers: 2,
    guard: false,
    delay: false,
    wordConflicts: false,
    known: [],
  },
  {
    name: "one reviewer, no guard, with a delay",
    reviewers: 1,
    guard: false,
    delay: true,
    wordConflicts: false,
    known: KNOWN_WITHOUT_GUARD,
  },
  {
    name: "two reviewers, no guard, with a delay",
    reviewers: 2,
    guard: false,
    delay: true,
    wordConflicts: false,
    known: KNOWN_WITHOUT_GUARD_TWO_REVIEWERS,
  },
];

describe("a session with random concurrent edits", () => {
  const report: unknown[] = [];

  it.each(VARIANTS)(
    "keeps its rules: $name",
    { timeout: 600_000 },
    async (variant) => {
      const failures: string[] = [];
      const totals: Record<string, number> = {};
      for (let seed = START; seed < START + SEEDS; seed++) {
        const { problems, log, stats } = await runScenario(seed, variant);
        for (const [name, count] of Object.entries(stats)) {
          totals[name] = (totals[name] ?? 0) + count;
        }
        while (mounted.length) {
          mounted.pop()?._tiptapEditor.destroy();
        }
        const unknown = problems.filter(
          (problem) => !variant.known.includes(problem.rule),
        );
        if (problems.length > 0) {
          report.push({ variant: variant.name, seed, problems, log });
        }
        if (unknown.length > 0) {
          failures.push(
            `seed ${seed}: ${unknown
              .map((problem) => `${problem.rule} (${problem.detail})`)
              .join("; ")}`,
          );
        }
      }
      report.push({ variant: variant.name, seeds: SEEDS, totals });
      // Each variant must do the work that its rules are about.
      expect(totals.userEdits).toBeGreaterThan(0);
      expect(totals.toolCallBatches).toBeGreaterThan(0);
      expect(totals.accepts).toBeGreaterThan(0);
      if (process.env.DOCUMENT_AGENT_FUZZ_REPORT !== undefined) {
        writeFileSync(
          process.env.DOCUMENT_AGENT_FUZZ_REPORT,
          JSON.stringify(report, undefined, 1),
        );
      }
      expect(failures).toEqual([]);
    },
  );
});
