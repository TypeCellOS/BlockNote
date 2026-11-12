import type { BlockNoteEditor } from "@blocknote/core";

import {
  getDocumentText,
  type LensBlock,
  markdownFormat,
  type MergeWarning,
} from "@blocknote/xl-ai/text-lens";
import type { ProposalStore } from "../stores/proposalStore.js";
import {
  type AgentDocument,
  conflictNotes,
  type OpenDocument,
  previewOf,
  type AgentToolCall,
  type ToolNote,
  warningNotes,
  type WriteResult,
} from "../tools/agentDocument.js";
import {
  type CreateEditor,
  openProposal,
  withBatch,
  writeBatch,
} from "./proposal.js";
import { rebaseProposal } from "./rebase.js";
import type { Batch, Proposal } from "./types.js";

/**
 * The extra data of each tool output in proposal mode: the batches that
 * the tool call added to the proposal, in sequence (the batch of a rebase,
 * then the batch of the tool). A client that follows the run applies them
 * to its copy of the proposal. The model does not get them (see
 * `describe.ts`).
 */
export type ProposalExtra = { batches: Batch[] };

/** The document of an agent in proposal mode: the proposal of one run. */
export type ProposalDocument = AgentDocument<ProposalExtra> & {
  /** Makes a headless editor with the schema of the app, for one call. */
  createEditor: CreateEditor;
};

/**
 * Makes the document of one run in proposal mode. This is the only place
 * where the hosts of this mode are different:
 *
 * - Without `readMain`, the proposal changes only through the tools. This
 *   is a run that a user starts: the client sends the proposal with the
 *   request, and the host cannot read the main document.
 * - With `readMain`, each step first rebases the proposal onto the current
 *   main document (see `rebaseProposal`). This is a run that a server
 *   starts.
 *
 * A step loads the proposal, rebases it, runs the tool, and saves the
 * batches of the step.
 */
export function createProposalDocument(options: {
  store: ProposalStore;
  proposalId: string;
  createEditor: CreateEditor;
  readMain?: () => Promise<LensBlock[] | undefined>;
}): ProposalDocument {
  const { store, proposalId, createEditor, readMain } = options;
  let queue: Promise<unknown> = Promise.resolve();

  async function runStep<T>(
    run: (document: OpenDocument) => T,
  ): Promise<{ result: T; extra: ProposalExtra }> {
    // Read the main document first. Then no other work is between the load
    // and the save of the proposal, except the work of the store.
    const main = await readMain?.();
    let proposal = await store.load(proposalId);
    if (proposal === undefined) {
      throw new Error(`The store has no proposal ${proposalId}`);
    }
    const batches: Batch[] = [];
    let dropped: MergeWarning[] = [];
    if (main !== undefined) {
      const rebase = rebaseProposal(createEditor, proposal, main);
      dropped = rebase.dropped;
      if (rebase.batch !== undefined) {
        batches.push(rebase.batch);
        proposal = withBatch(proposal, rebase.batch);
      }
    }
    const mainChanged = batches.some((batch) => batch.operations.length > 0);
    const open = openStep(createEditor, proposal, dropped, mainChanged);
    const result = run(open.document);
    const batch = open.batch();
    if (batch !== undefined) {
      batches.push(batch);
      proposal = withBatch(proposal, batch);
    }
    if (batches.length > 0) {
      await store.save(proposalId, proposal);
    }
    return { result, extra: { batches } };
  }

  return {
    createEditor,
    noStep: { batches: [] },
    step(run) {
      const step = queue.then(() => runStep(run));
      // A step that throws must not stop the steps after it.
      queue = step.catch(() => undefined);
      return step;
    },
  };
}

/**
 * The proposal document for one step of a tool. `batch()` gives the batch
 * of the write of the step, if the step wrote.
 */
function openStep(
  createEditor: CreateEditor,
  proposal: Proposal,
  dropped: readonly MergeWarning[],
  mainChanged: boolean,
): { document: OpenDocument; batch: () => Batch | undefined } {
  let batch: Batch | undefined;
  let wrote = false;
  /** The editor with the proposal document, made at the first use. */
  let opened: BlockNoteEditor<any, any, any> | undefined;
  function editor(): BlockNoteEditor<any, any, any> {
    opened ??= openProposal(createEditor, proposal).editor;
    return opened;
  }

  function write(
    change: { markdown: string; base: string },
    toolCall: AgentToolCall,
  ): WriteResult {
    if (wrote) {
      throw new Error("A step makes one write at most");
    }
    const baseSeq = parseVersion(change.base, proposal);
    if (baseSeq === undefined) {
      return { error: "unknown-version" };
    }
    let base: LensBlock[] | undefined;
    if (baseSeq !== proposal.batches.length) {
      // An earlier version: the replay gives it, with the current document.
      const replay = openProposal(createEditor, proposal, [baseSeq]);
      opened ??= replay.editor;
      base = replay.versions.get(baseSeq);
    }
    const target = editor();
    const before: LensBlock[] = target.document;
    const written = writeBatch(
      createEditor,
      target,
      {
        format: markdownFormat,
        text: change.markdown,
        // The agent read the current version: the text is the truth.
        ...(base === undefined
          ? { base: "current" }
          : { base, onConflict: "reject" }),
      },
      proposal.batches.length + 1,
      { type: "tool-call", ...toolCall },
    );
    if (written.error === "invalid-document") {
      return { error: "invalid-document" };
    }
    if (written.error === "conflict") {
      return {
        error: "conflict",
        conflicts: conflictNotes(written.conflicts, before),
      };
    }
    wrote = true;
    batch = written.batch;
    return {
      version: `v${proposal.batches.length + (batch === undefined ? 0 : 1)}`,
      changed: batch !== undefined,
      notes: warningNotes(written.warnings, before, target.document),
    };
  }

  return {
    document: {
      markdown: () => getDocumentText(editor(), markdownFormat),
      version: `v${proposal.batches.length}`,
      notes: () => [
        ...(mainChanged ? [{ type: "main-changed" as const }] : []),
        ...droppedNotes(dropped, editor().document),
      ],
      write,
    },
    batch: () => batch,
  };
}

/** The batch number of a version token, or `undefined` if the proposal has no such version. */
function parseVersion(token: string, proposal: Proposal): number | undefined {
  const match = /^v(\d+)$/.exec(token.trim());
  const seq = match === null ? undefined : Number(match[1]);
  return seq !== undefined && seq <= proposal.batches.length ? seq : undefined;
}

/** The notes for the changes of the agent that a rebase dropped. */
function droppedNotes(
  dropped: readonly MergeWarning[],
  document: readonly LensBlock[],
): ToolNote[] {
  return dropped.map((warning) => ({
    type: "dropped",
    warning,
    text: previewOf(document, warning.id),
  }));
}
