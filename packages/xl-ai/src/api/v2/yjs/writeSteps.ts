import { updateYFragment } from "@blocknote/core/yjs";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  AddMarkStep,
  AttrStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  type Step,
} from "prosemirror-transform";
import * as Y from "yjs";

/**
 * Writes the steps of the transaction to the fragment, each step alone, in
 * one Yjs transaction. Thus, each Yjs change is as small as its step. This is
 * necessary for the "yjs" strategy: if one paragraph has two changes, one
 * diff of the full text would replace the text between them, and Yjs would
 * then add a change of another writer there a second time.
 *
 * The fragment must agree with `tr.before`.
 *
 * Each step writes only the block that contains it (`updateYFragment` on the
 * Y element of that block). Thus, the time for a write is linear in the size
 * of the document and the changes. A step that changes more than one block,
 * or a new block, writes the full document.
 */
export function writeSteps(
  ydoc: Y.Doc,
  fragment: Y.XmlFragment,
  tr: Transaction,
) {
  const meta = { mapping: new Map(), isOMark: new Map() };
  let elements = elementsById(fragment);
  let doc = tr.before;
  ydoc.transact(() => {
    updateYFragment(ydoc, fragment, doc, meta);
    for (const step of tr.steps) {
      const block = blockOfStep(doc, step);
      const result = step.apply(doc);
      if (result.doc === null) {
        throw new Error(`Step does not apply again: ${result.failed}`);
      }
      doc = result.doc;
      const node = block && doc.nodeAt(block.pos);
      const element = block && elements.get(block.id);
      if (
        node &&
        element &&
        node.attrs.id === block.id &&
        node.type.name === element.nodeName
      ) {
        updateYFragment(ydoc, element, node, meta);
      } else {
        updateYFragment(ydoc, fragment, doc, meta);
        elements = elementsById(fragment);
      }
    }
  });
}

/**
 * The innermost block that contains the full range of the step, with its
 * position before the step. `undefined` if the step changes the top level,
 * or if the step type is not known here.
 */
function blockOfStep(
  doc: Node,
  step: Step,
): { id: string; pos: number } | undefined {
  const range = rangeOf(step);
  if (range === undefined) {
    return undefined;
  }
  const $from = doc.resolve(range.from);
  for (let depth = $from.sharedDepth(range.to); depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.isInGroup("bnBlock") && typeof node.attrs.id === "string") {
      return { id: node.attrs.id, pos: $from.before(depth) };
    }
  }
  return undefined;
}

/** The range that the step changes, in the document before the step. */
function rangeOf(step: Step): { from: number; to: number } | undefined {
  if (
    step instanceof ReplaceStep ||
    step instanceof ReplaceAroundStep ||
    step instanceof AddMarkStep ||
    step instanceof RemoveMarkStep
  ) {
    return { from: step.from, to: step.to };
  }
  if (step instanceof AttrStep) {
    return { from: step.pos, to: step.pos };
  }
  return undefined;
}

/** The Y element of each block ID. An ID that more than one element has is not in the map. */
function elementsById(fragment: Y.XmlFragment): Map<string, Y.XmlElement> {
  const elements = new Map<string, Y.XmlElement>();
  const repeated = new Set<string>();
  for (const node of fragment.createTreeWalker(
    (type) => type instanceof Y.XmlElement,
  )) {
    const id = (node as Y.XmlElement).getAttribute("id");
    if (typeof id !== "string") {
      continue;
    }
    if (elements.has(id)) {
      repeated.add(id);
    }
    elements.set(id, node as Y.XmlElement);
  }
  for (const id of repeated) {
    elements.delete(id);
  }
  return elements;
}
