import {
  BlockNoteEditor,
  type BlockNoteEditorOptions,
  type PartialBlock,
} from "@blocknote/core";

import {
  applyOperations,
  type BlockOperation,
  type ChangeWarning,
  computeOperations,
  type ConflictError,
  type DocumentChange,
  type LensBlock,
} from "../../api/v2/index.js";
import { hashDocument } from "./hash.js";
import type { Batch, BatchSource, Proposal } from "./types.js";

/**
 * Makes a headless editor with the schema of the app, for one call. No host
 * keeps an editor between calls: the state is the proposal, in a store.
 */
export type CreateEditor = (
  blocks: readonly LensBlock[],
) => BlockNoteEditor<any, any, any>;

/** The editor options that the headless editors of a host share, for example the schema. */
export type HeadlessEditorOptions = Pick<
  Partial<BlockNoteEditorOptions<any, any, any>>,
  "schema"
>;

/**
 * Returns a function that makes a headless editor for a document. The
 * editor has no trailing block: it must not add a block that the document
 * does not have.
 */
export function headlessEditorFactory(
  options: HeadlessEditorOptions = {},
): CreateEditor {
  return function createEditor(blocks) {
    return BlockNoteEditor.create({
      // An option with the value `undefined` would replace the default.
      ...(options.schema !== undefined && { schema: options.schema }),
      initialContent: blocks as PartialBlock<any, any, any>[],
      trailingBlock: false,
    });
  };
}

/** A new proposal for a main document. It has no changes. */
export function createProposal(origin: readonly LensBlock[]): Proposal {
  return { origin: [...origin], batches: [] };
}

/**
 * Returns true if the value has the shape of a proposal. This examines
 * only the shape: the replay of a proposal examines the hash of its last
 * batch (see {@link replayProposal}).
 */
export function isProposalShape(value: unknown): value is Proposal {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { origin, batches } = value as Partial<Proposal>;
  return Array.isArray(origin) && Array.isArray(batches);
}

/**
 * The fork point F: the version of the main document that the proposal
 * merges from. It is the origin, until a rebase or an accept moves it.
 */
export function forkPointOf(proposal: Proposal): LensBlock[] {
  for (let i = proposal.batches.length - 1; i >= 0; i--) {
    const { source } = proposal.batches[i];
    if (source.type === "rebase" || source.type === "accept") {
      return source.forkPoint;
    }
  }
  return proposal.origin;
}

/** The proposal with one more batch. */
export function withBatch(proposal: Proposal, batch: Batch): Proposal {
  if (batch.seq !== proposal.batches.length + 1) {
    throw new Error(
      `Batch ${batch.seq} does not follow batch ${proposal.batches.length}`,
    );
  }
  return { origin: proposal.origin, batches: [...proposal.batches, batch] };
}

/** A proposal document that a replay made, or the batch whose hash did not agree. */
export type ReplayResult =
  | {
      error?: undefined;
      /** A headless editor with the proposal document. */
      editor: BlockNoteEditor<any, any, any>;
      /** The proposal document at each version that the caller asked for. */
      versions: Map<number, LensBlock[]>;
    }
  | { error: "hash-mismatch"; seq: number };

/**
 * Makes the proposal document: a new headless editor with the origin, and
 * each batch applied. `versions` lists the versions to keep: version `n` is
 * the document after the first `n` batches.
 *
 * The document after the last batch must have the hash of that batch. A
 * different hash is the error `hash-mismatch`: this host and the host that
 * made the batch do not have the same document.
 */
export function replayProposal(
  createEditor: CreateEditor,
  proposal: Proposal,
  versions: readonly number[] = [],
): ReplayResult {
  const editor = createEditor(proposal.origin);
  const kept = new Map<number, LensBlock[]>();
  if (versions.includes(0)) {
    kept.set(0, editor.document);
  }
  for (const batch of proposal.batches) {
    applyToEditor(editor, batch.operations);
    if (versions.includes(batch.seq)) {
      kept.set(batch.seq, editor.document);
    }
  }
  const last = proposal.batches.at(-1);
  if (last !== undefined && hashDocument(editor.document) !== last.hash) {
    return { error: "hash-mismatch", seq: last.seq };
  }
  return { editor, versions: kept };
}

/**
 * Returns true if the batch follows the proposal: it has the next number,
 * its operations apply to the proposal document, and the result has the
 * hash of the batch.
 *
 * A host examines a batch of a client with this function before it saves
 * the batch. A client can make a batch for a different history of the
 * proposal: for example, it did not get the last batches of the host. The
 * number of such a batch can be correct by chance. A batch that does not
 * fit is an expected failure, thus the result is a value.
 */
export function batchFollows(
  createEditor: CreateEditor,
  proposal: Proposal,
  batch: Batch,
): boolean {
  if (batch.seq !== proposal.batches.length + 1) {
    return false;
  }
  const { editor } = openProposal(createEditor, proposal);
  try {
    applyToEditor(editor, batch.operations);
  } catch {
    // The operations name a block that this proposal document does not
    // have, or a position that does not exist.
    return false;
  }
  return hashDocument(editor.document) === batch.hash;
}

/**
 * Makes the proposal document (see {@link replayProposal}). Throws for a
 * hash that does not agree: use it where the proposal comes from this host.
 */
export function openProposal(
  createEditor: CreateEditor,
  proposal: Proposal,
  versions: readonly number[] = [],
): Extract<ReplayResult, { error?: undefined }> {
  const replay = replayProposal(createEditor, proposal, versions);
  if (replay.error !== undefined) {
    throw new Error(
      `The proposal document does not have the hash of batch ${replay.seq}`,
    );
  }
  return replay;
}

/** A change that applied (with its batch, if the document changed), or an error of the lens. */
export type BatchResult =
  | {
      error?: undefined;
      /** `undefined` if the change gave no operations. */
      batch: Batch | undefined;
      warnings: ChangeWarning[];
    }
  | { error: "invalid-document" }
  | ConflictError;

/**
 * Computes a change for the document of the editor, applies it to the
 * editor, and returns it as a batch. On an error, the editor does not
 * change.
 *
 * The operations of the batch give the same document on each host (see
 * {@link reproducibleOperations}).
 */
export function writeBatch(
  createEditor: CreateEditor,
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentChange,
  seq: number,
  source: BatchSource,
): BatchResult {
  const before: LensBlock[] = editor.document;
  const result = computeOperations(editor, change);
  if (result.error !== undefined) {
    return result;
  }
  if (result.operations.length === 0) {
    return { batch: undefined, warnings: result.warnings };
  }
  applyToEditor(editor, result.operations);
  const after: LensBlock[] = editor.document;
  const operations = reproducibleOperations(
    createEditor,
    before,
    after,
    result.operations,
  );
  return {
    batch: {
      seq,
      source,
      operations,
      changedBlockIds: changedBlockIdsOf(operations, before, after),
      hash: hashDocument(after),
    },
    warnings: result.warnings,
  };
}

/** Applies operations to a headless editor, in one transaction. */
export function applyToEditor(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): void {
  if (operations.length === 0) {
    return;
  }
  editor.transact((tr) => {
    // The operations are not typed text: the autolink plugin must not
    // change a URL into a link.
    tr.setMeta("preventAutolink", true);
    applyOperations(tr, operations);
  });
}

/** The IDs of all blocks of a document, with the blocks in them. */
export function blockIdsOf(blocks: readonly LensBlock[]): string[] {
  const ids: string[] = [];
  const stack = [...blocks].reverse();
  for (let block = stack.pop(); block !== undefined; block = stack.pop()) {
    ids.push(block.id);
    for (let i = block.children.length - 1; i >= 0; i--) {
      stack.push(block.children[i]);
    }
  }
  return ids;
}

/**
 * The operations that change `before` into `after` on each host.
 *
 * The apply of the lens can add a block that no operation inserts: the
 * fill of the schema, for example the paragraph of a document without
 * blocks. Each editor gives such a block its own ID. Thus, the same
 * operations give a different document on another host. If `after` has
 * such a block, the result is the operations of the JSON write of `after`:
 * they insert each new block with its ID.
 */
function reproducibleOperations(
  createEditor: CreateEditor,
  before: readonly LensBlock[],
  after: readonly LensBlock[],
  operations: BlockOperation[],
): BlockOperation[] {
  const known = new Set(blockIdsOf(before));
  for (const operation of operations) {
    if (operation.type === "insert") {
      for (const id of blockIdsOf([operation.block])) {
        known.add(id);
      }
    }
  }
  if (blockIdsOf(after).every((id) => known.has(id))) {
    return operations;
  }
  const result = computeOperations(createEditor(before), {
    document: after,
    base: "current",
  });
  if (result.error !== undefined) {
    // `after` is the document of an editor: it fits the schema.
    throw new Error(`The document of an editor is not valid: ${result.error}`);
  }
  return result.operations;
}

/** The blocks that the operations change, and the blocks that they add or remove. */
function changedBlockIdsOf(
  operations: readonly BlockOperation[],
  before: readonly LensBlock[],
  after: readonly LensBlock[],
): string[] {
  const changed = new Set<string>();
  for (const operation of operations) {
    changed.add(
      operation.type === "insert" ? operation.block.id : operation.id,
    );
  }
  const beforeIds = new Set(blockIdsOf(before));
  const afterIds = new Set(blockIdsOf(after));
  for (const id of beforeIds) {
    if (!afterIds.has(id)) {
      changed.add(id);
    }
  }
  for (const id of afterIds) {
    if (!beforeIds.has(id)) {
      changed.add(id);
    }
  }
  return [...changed];
}
