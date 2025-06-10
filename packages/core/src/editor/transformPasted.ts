import { Fragment, Schema, Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";

import { getBlockInfoFromSelection } from "../api/getBlockInfoFromPos.js";

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
