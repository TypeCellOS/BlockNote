import { Fragment, Mark, Node, Schema, Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";

import { getBlockInfoFromSelection } from "../api/getBlockInfoFromPos.js";
import { canonicalBlockName } from "../schema/blocks/attributedNodes.js";

/**
 * The y-prosemirror binding's three canonical attribution marks (suggestion
 * mode / version diffs). Content carrying `y-attributed-delete` is *deleted*
 * content. These names are part of the binding contract; see
 * `extensions/tiptap-extensions/Suggestions/AttributionMarks.ts`.
 */
const ATTRIBUTED_INSERT_MARK = "y-attributed-insert";
const ATTRIBUTED_DELETE_MARK = "y-attributed-delete";
const ATTRIBUTED_FORMAT_MARK = "y-attributed-format";

const ATTRIBUTED_MARK_NAMES: readonly string[] = [
  ATTRIBUTED_INSERT_MARK,
  ATTRIBUTED_DELETE_MARK,
  ATTRIBUTED_FORMAT_MARK,
];

/**
 * Whether a node is "deleted" attributed content that must not paste. This is
 * the case when it (a) carries the `y-attributed-delete` mark, or (b) is a
 * `*--attributed` block node whose binding-only `y-attributed` attribute marks
 * it as a deletion (`{ type: "delete" }` / `"delete"`).
 */
function isDeletedAttributedNode(node: Node): boolean {
  if (node.marks.some((mark) => mark.type.name === ATTRIBUTED_DELETE_MARK)) {
    return true;
  }

  const attributed = node.attrs?.["y-attributed"];
  if (attributed) {
    const type =
      typeof attributed === "string" ? attributed : attributed.type;
    if (type === "delete") {
      return true;
    }
  }

  return false;
}

/**
 * Filter out the three `y-attributed-*` marks from a mark set.
 */
function stripAttributedMarks(marks: readonly Mark[]): Mark[] {
  return marks.filter(
    (mark) => !ATTRIBUTED_MARK_NAMES.includes(mark.type.name),
  );
}

/**
 * Recursively rebuild `fragment`, producing CLEAN content for pasting from
 * "attributed" (suggestion-mode / version-diff) sources:
 *
 *   1. Drop any node that is *deleted* attributed content (carries
 *      `y-attributed-delete`, or is a deleted `*--attributed` block) — you
 *      never paste someone else's deleted text.
 *   2. Rewrite any surviving `*--attributed` block node to its canonical type
 *      (e.g. `paragraph--attributed` -> `paragraph`).
 *   3. Strip the three `y-attributed-*` marks from every remaining node so the
 *      pasted content is never accidentally re-marked as attributed.
 */
function stripAttributionFromFragment(
  fragment: Fragment,
  schema: Schema,
): Fragment {
  const result: Node[] = [];

  fragment.forEach((node) => {
    // 1. Drop deleted attributed content entirely.
    if (isDeletedAttributedNode(node)) {
      return;
    }

    const filteredMarks = stripAttributedMarks(node.marks);

    if (node.isText) {
      // Text/leaf nodes: keep, but with the attribution marks removed.
      result.push(node.mark(filteredMarks));
      return;
    }

    // Recurse into children first.
    const newContent = stripAttributionFromFragment(node.content, schema);

    // 2. Map a `*--attributed` block node back to its canonical type.
    const canonicalName = canonicalBlockName(node.type.name);
    const targetType =
      canonicalName !== node.type.name && schema.nodes[canonicalName]
        ? schema.nodes[canonicalName]
        : node.type;

    if (targetType !== node.type) {
      // Don't carry the binding-only `y-attributed` attr onto the canonical
      // node (it doesn't exist there).
      const { "y-attributed": _yAttributed, ...attrs } = node.attrs ?? {};
      result.push(targetType.create(attrs, newContent, filteredMarks));
      return;
    }

    result.push(node.copy(newContent).mark(filteredMarks));
  });

  return Fragment.from(result);
}

/**
 * Paste filter: produce CLEAN content when pasting "attributed" (suggestion
 * mode / version diff) content. Removes deleted content, canonicalizes
 * `*--attributed` blocks, and strips the `y-attributed-*` marks. See
 * {@link stripAttributionFromFragment}.
 */
export function stripAttribution(slice: Slice, view: EditorView): Slice {
  const content = stripAttributionFromFragment(
    slice.content,
    view.state.schema,
  );
  return new Slice(content, slice.openStart, slice.openEnd);
}

// helper function to remove a child from a fragment
function removeChild(node: Fragment, n: number) {
  const children: any[] = [];
  node.forEach((child, _, i) => {
    if (i !== n) {
      children.push(child);
    }
  });
  return Fragment.from(children);
}

/**
 * Wrap adjacent tableRow items in a table.
 *
 * This makes sure the content that we paste is always a table (and not a tableRow)
 * A table works better for the remaing paste handling logic, as it's actually a blockContent node
 */
export function wrapTableRows(f: Fragment, schema: Schema) {
  const newItems: any[] = [];
  for (let i = 0; i < f.childCount; i++) {
    if (f.child(i).type.name === "tableRow") {
      if (
        newItems.length > 0 &&
        newItems[newItems.length - 1].type.name === "table"
      ) {
        // append to existing table
        const prevTable = newItems[newItems.length - 1];
        const newTable = prevTable.copy(prevTable.content.addToEnd(f.child(i)));
        newItems[newItems.length - 1] = newTable;
      } else {
        // create new table to wrap tableRow with
        const newTable = schema.nodes.table.createChecked(
          undefined,
          f.child(i),
        );
        newItems.push(newTable);
      }
    } else {
      newItems.push(f.child(i));
    }
  }
  f = Fragment.from(newItems);
  return f;
}

/**
 * fix for https://github.com/ProseMirror/prosemirror/issues/1430#issuecomment-1822570821
 *
 * This fix wraps pasted ProseMirror nodes in their own `blockContainer` nodes
 * in most cases. This is to ensure that ProseMirror inserts them as separate
 * blocks, which it sometimes doesn't do because it doesn't have enough context
 * about the hierarchy of the pasted nodes. The issue can be seen when pasting
 * e.g. an image or two consecutive paragraphs, where PM tries to nest the
 * pasted block(s) when it shouldn't.
 *
 * However, the fix is not applied in a few cases. See `shouldApplyFix` for
 * which cases are excluded.
 */
export function transformPasted(slice: Slice, view: EditorView) {
  // First, strip any "attributed" (suggestion-mode / version-diff) artifacts so
  // the rest of the paste pipeline only ever sees clean, canonical content:
  // deleted content is dropped, `*--attributed` blocks are canonicalized, and
  // the `y-attributed-*` marks are removed.
  slice = stripAttribution(slice, view);

  let f = Fragment.from(slice.content);
  f = wrapTableRows(f, view.state.schema);

  if (!shouldApplyFix(f, view)) {
    // Don't apply the fix.
    return new Slice(f, slice.openStart, slice.openEnd);
  }

  for (let i = 0; i < f.childCount; i++) {
    if (f.child(i).type.spec.group === "blockContent") {
      const content = [f.child(i)];

      // when there is a blockGroup with lists, it should be nested in the new blockcontainer
      // (if we remove this if-block, the nesting bug will be fixed, but lists won't be nested correctly)
      if (
        i + 1 < f.childCount &&
        f.child(i + 1).type.name === "blockGroup" // TODO
      ) {
        const nestedChild = f
          .child(i + 1)
          .child(0)
          .child(0);

        if (
          nestedChild.type.name === "bulletListItem" ||
          nestedChild.type.name === "numberedListItem" ||
          nestedChild.type.name === "checkListItem"
        ) {
          content.push(f.child(i + 1));
          f = removeChild(f, i + 1);
        }
      }
      const container = view.state.schema.nodes.blockContainer.createChecked(
        undefined,
        content,
      );
      f = f.replaceChild(i, container);
    }
  }
  return new Slice(f, slice.openStart, slice.openEnd);
}

/**
 * Used in `transformPasted` to check if the fix there should be applied, i.e.
 * if the pasted fragment should be wrapped in a `blockContainer` node. This
 * will explicitly tell ProseMirror to treat it as a separate block.
 */
function shouldApplyFix(fragment: Fragment, view: EditorView) {
  const nodeHasSingleChild = fragment.childCount === 1;
  const nodeHasInlineContent =
    fragment.firstChild?.type.spec.content === "inline*";
  const nodeHasTableContent =
    fragment.firstChild?.type.spec.content === "tableRow+";

  if (nodeHasSingleChild) {
    if (nodeHasInlineContent) {
      // Case when we paste a single node with inline content, e.g. a paragraph
      // or heading. We want to insert the content in-line for better UX instead
      // of a separate block, so we return false.
      return false;
    }

    if (nodeHasTableContent) {
      // Not ideal that we check selection here, as `transformPasted` is called
      // for both paste and drop events. Drop events can potentially cause
      // issues as they don't always happen at the current selection.
      const blockInfo = getBlockInfoFromSelection(view.state);
      if (blockInfo.isBlockContainer) {
        const selectedBlockHasTableContent =
          blockInfo.blockContent.node.type.spec.content === "tableRow+";

        // Case for when we paste a single node with table content, i.e. a
        // table. Normally, we return true as we want to ensure the table is
        // inserted as a separate block. However, if the selection is in an
        // existing table, we return false, as we want the content of the pasted
        // table to be added to the existing one for better UX.
        return !selectedBlockHasTableContent;
      }
    }
  }

  return true;
}
