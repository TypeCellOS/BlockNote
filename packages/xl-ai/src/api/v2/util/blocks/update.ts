import { deepEqual } from "./json.js";
import type { BlockFields, LensPartialBlock } from "../../model.js";

/**
 * Returns the update that changes the fields of `block` to `target`, or
 * `undefined` if they are equal. The update contains only the changed fields
 * and props. If the type changes, the update contains all props and the
 * content of the new type. Equal content in Block JSON can be different
 * content in ProseMirror for a different type: for example, `"\n"` is a hard
 * break in a paragraph, but a line end in a code block.
 */
export function diffBlock(
  block: BlockFields,
  target: BlockFields,
): LensPartialBlock | undefined {
  const update: LensPartialBlock = {};

  if (target.type !== block.type) {
    update.type = target.type;
    update.props = target.props;
  } else {
    const props = Object.fromEntries(
      Object.entries(target.props).filter(
        ([key, value]) => !deepEqual(value, block.props[key]),
      ),
    );
    if (Object.keys(props).length > 0) {
      update.props = props;
    }
  }

  if (target.type !== block.type || !deepEqual(target.content, block.content)) {
    update.content = target.content;
  }

  return Object.keys(update).length > 0 ? update : undefined;
}
