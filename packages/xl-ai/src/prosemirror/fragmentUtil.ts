import { Fragment } from "prosemirror-model";

/**
 * helper method to get the index of the first character of a fragment
 */
export function getFirstChar(fragment: Fragment) {
  let index: number | undefined = undefined;
  let found = false;
  fragment.descendants((n, pos) => {
    if (found) {
      return false;
    }
    if (n.isText) {
      found = true;
      index = pos;
    }
    return true;
  });
  return index;
}
