import { updateYFragment } from "@blocknote/core/yjs";
import type { Node, ResolvedPos } from "prosemirror-model";
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
 * Each step writes only the innermost block that contains it
 * (`updateYFragment` on the Y element of that block). Thus, a change in a
 * block costs time for that block only. A step that inserts or removes whole
 * blocks in a block group changes the Y children of that group directly
 * (see `replaceChildren`). Other steps write the full document.
 */
export function writeSteps(
  ydoc: Y.Doc,
  fragment: Y.XmlFragment,
  tr: Transaction,
) {
  const meta = { mapping: new Map(), isOMark: new Map() };
  let doc = tr.before;
  ydoc.transact(() => {
    updateYFragment(ydoc, fragment, doc, meta);
    for (const step of tr.steps) {
      // The Y tree agrees with `doc` before the step. Thus, the path of the
      // block in `doc` gives its Y element.
      const block = blockOfStep(doc, step, fragment);
      const children = block ? undefined : childrenOfStep(doc, step, fragment);
      const result = step.apply(doc);
      if (result.doc === null) {
        throw new Error(`Step does not apply again: ${result.failed}`);
      }
      doc = result.doc;
      const node = block && doc.nodeAt(block.pos);
      if (node && block && node.type.name === block.element.nodeName) {
        updateYFragment(ydoc, block.element, node, meta);
      } else if (children) {
        replaceChildren(ydoc, children, meta);
      } else {
        updateYFragment(ydoc, fragment, doc, meta);
      }
    }
  });
}

/**
 * The innermost block that contains the full range of the step: its Y
 * element, and its position before the step. `undefined` if the step changes
 * the top level, or if the step type is not known here.
 */
function blockOfStep(
  doc: Node,
  step: Step,
  fragment: Y.XmlFragment,
): { element: Y.XmlElement; pos: number } | undefined {
  const range = rangeOf(step);
  if (range === undefined) {
    return undefined;
  }
  const $from = doc.resolve(range.from);
  for (let depth = $from.sharedDepth(range.to); depth > 0; depth--) {
    if ($from.node(depth).type.isInGroup("bnBlock")) {
      const element = elementAt(fragment, $from, depth);
      return element && { element, pos: $from.before(depth) };
    }
  }
  return undefined;
}

/**
 * The Y element of the node at `depth` of `$pos`: the same child indexes,
 * from the fragment. Above the text of a block, each ProseMirror node has
 * one Y element.
 */
function elementAt(
  fragment: Y.XmlFragment,
  $pos: ResolvedPos,
  depth: number,
): Y.XmlElement | undefined {
  let current: Y.XmlFragment | Y.XmlElement = fragment;
  for (let d = 0; d < depth; d++) {
    const child: unknown = current.get($pos.index(d));
    if (!(child instanceof Y.XmlElement)) {
      return undefined;
    }
    current = child;
  }
  return current as Y.XmlElement;
}

/**
 * A step that replaces whole children of one parent with new nodes: the Y
 * element of the parent, the index of the first replaced child, the number
 * of replaced children, and the new nodes. `undefined` for other steps.
 */
type ChildrenReplace = {
  parent: Y.XmlElement | Y.XmlFragment;
  index: number;
  count: number;
  nodes: readonly Node[];
};

function childrenOfStep(
  doc: Node,
  step: Step,
  fragment: Y.XmlFragment,
): ChildrenReplace | undefined {
  if (
    !(step instanceof ReplaceStep) ||
    step.slice.openStart !== 0 ||
    step.slice.openEnd !== 0
  ) {
    return undefined;
  }
  const $from = doc.resolve(step.from);
  const $to = doc.resolve(step.to);
  const depth = $from.depth;
  // A position directly in a parent that is not a text block is between two
  // of its children.
  if (
    $to.depth !== depth ||
    $from.parent !== $to.parent ||
    $from.parent.isTextblock
  ) {
    return undefined;
  }
  const nodes: Node[] = [];
  step.slice.content.forEach((node) => nodes.push(node));
  if (nodes.some((node) => node.isText)) {
    return undefined;
  }
  const parent = depth === 0 ? fragment : elementAt(fragment, $from, depth);
  return (
    parent && {
      parent,
      index: $from.index(),
      count: $to.index() - $from.index(),
      nodes,
    }
  );
}

/**
 * Removes the replaced Y children, and adds a new Y element for each new
 * node. `updateYFragment` then fills only the new element from its node.
 */
function replaceChildren(
  ydoc: Y.Doc,
  { parent, index, count, nodes }: ChildrenReplace,
  meta: Parameters<typeof updateYFragment>[3],
) {
  if (count > 0) {
    parent.delete(index, count);
  }
  nodes.forEach((node, i) => {
    const element = new Y.XmlElement(node.type.name);
    parent.insert(index + i, [element]);
    updateYFragment(ydoc, element, node, meta);
  });
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
