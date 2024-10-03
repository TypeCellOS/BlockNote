import { Fragment, Schema, Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";

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
        const newTable = schema.nodes.table.create(undefined, f.child(i));
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
 * Without this fix, pasting two paragraphs would cause the second one to be indented in the other
 * this fix wraps every element in the slice in it's own blockContainer, to prevent Prosemirror from nesting the
 * elements on paste.
 *
 * The exception is when we encounter blockGroups with listitems, because those actually should be nested
 */
export function transformPasted(slice: Slice, view: EditorView) {
  let f = Fragment.from(slice.content);
  f = wrapTableRows(f, view.state.schema);

  for (let i = 0; i < f.childCount; i++) {
    if (f.child(i).type.spec.group === "blockContent") {
      const content = [f.child(i)];

      // when there is a blockGroup with lists, it should be nested in the new blockcontainer
      // (if we remove this if-block, the nesting bug will be fixed, but lists won't be nested correctly)
      if (
        i + 1 < f.childCount &&
        f.child(i + 1).type.spec.group === "blockGroup"
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
      const container = view.state.schema.nodes.blockContainer.create(
        undefined,
        content
      );
      f = f.replaceChild(i, container);
    }
  }
  return new Slice(f, slice.openStart, slice.openEnd);
}
