import { Fragment, Slice } from "@tiptap/pm/model";

/**
 * Open selections can start with contentless ancestor containers (#1117).
 * Remove unselected ancestor shells so paste and drop both insert the selected
 * block forest. No destination/selection lookup is needed; normal fitting handles
 * endpoint joining, attributes, and the actual insertion position.
 */
export function normalizeBlockNesting(slice: Slice): Slice {
  if (slice.openEnd < 3) {
    return slice;
  }

  let { content, openStart, openEnd } = slice;
  while (openStart > 3) {
    const group = content.firstChild;
    const shell = group?.firstChild;
    const nested = shell?.firstChild;
    if (
      content.childCount !== 1 ||
      group?.type.name !== "blockGroup" ||
      shell?.type.name !== "blockContainer" ||
      shell.childCount !== 1 ||
      nested?.type.name !== "blockGroup"
    ) {
      break;
    }
    if (group.childCount === 1) {
      // Both endpoints lie inside this unselected ancestor.
      if (openEnd <= 3) {
        break;
      }
      content = Fragment.from(nested);
      openEnd -= 2;
    } else {
      content = Fragment.from(
        group.copy(nested.content.append(group.content.cut(shell.nodeSize))),
      );
    }
    openStart -= 2;
  }
  return openStart === slice.openStart
    ? slice
    : new Slice(content, openStart, openEnd);
}
