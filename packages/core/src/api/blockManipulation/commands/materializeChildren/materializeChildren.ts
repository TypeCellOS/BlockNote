import { Fragment, type Node } from "prosemirror-model";
import { TextSelection, type Transaction } from "prosemirror-state";
import {
  getBlockInfoAt,
  getInsertionPos,
} from "../../../getBlockInfoFromPos.js";
import { getPmSchema } from "../../../pmUtil.js";

/** Prepends children, creating their group together with its first child.
 * Returns undefined without changing the transaction if the content cannot fit. */
export function materializeChildren(
  tr: Transaction,
  blockPos: number,
  nodes: readonly Node[],
): number | undefined {
  if (!nodes.length) {
    return undefined;
  }
  const target = getInsertionPos(
    tr.doc,
    getBlockInfoAt(tr.doc, blockPos),
    "first-child",
    nodes[0].type,
  );
  if (!target) {
    return undefined;
  }
  const content = Fragment.from(nodes);
  if (target.wrapIn && !target.wrapIn.validContent(content)) {
    return undefined;
  }
  const fragment = target.wrapIn
    ? Fragment.from(target.wrapIn.create(null, content))
    : content;
  const $pos = tr.doc.resolve(target.pos);
  if (!$pos.parent.canReplace($pos.index(), $pos.index(), fragment)) {
    return undefined;
  }
  tr.insert(target.pos, fragment);
  return target.pos + (target.wrapIn ? 1 : 0);
}

/** Shared by Enter and the empty-toggle button. */
export function insertEmptyFirstChild(
  tr: Transaction,
  blockPos: number,
): boolean {
  const schema = getPmSchema(tr);
  const child = schema.nodes.blockContainer.create(
    null,
    schema.nodes.paragraph.create(),
  );
  const pos = materializeChildren(tr, blockPos, [child]);
  if (pos === undefined) {
    return false;
  }
  tr.setSelection(TextSelection.near(tr.doc.resolve(pos), 1)).scrollIntoView();
  return true;
}
