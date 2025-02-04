import { Fragment, Schema, Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
/**
 * Wrap adjacent tableRow items in a table.
 *
 * This makes sure the content that we paste is always a table (and not a tableRow)
 * A table works better for the remaing paste handling logic, as it's actually a blockContent node
 */
export declare function wrapTableRows(f: Fragment, schema: Schema): Fragment;
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
export declare function transformPasted(slice: Slice, view: EditorView): Slice;
