import { Element as HASTElement, Parent as HASTParent } from "hast";
import { fromDom } from "hast-util-from-dom";

/**
 * Rehype plugin which adds a space after each checkbox input element. This is
 * because remark doesn't add any spaces between the checkbox input and the text
 * itself, but these are needed for correct Markdown syntax.
 */
export function addSpacesToCheckboxes() {
  const helper = (tree: HASTParent) => {
    if (tree.children && "length" in tree.children && tree.children.length) {
      for (let i = tree.children.length - 1; i >= 0; i--) {
        const child = tree.children[i];
        const nextChild =
          i + 1 < tree.children.length ? tree.children[i + 1] : undefined;

        // Checks for paragraph element after checkbox input element.
        if (
          child.type === "element" &&
          child.tagName === "input" &&
          child.properties?.type === "checkbox" &&
          nextChild?.type === "element" &&
          nextChild.tagName === "p"
        ) {
          // Converts paragraph to span, otherwise remark will think it needs to
          // be on a new line.
          nextChild.tagName = "span";
          // Adds a space after the checkbox input element.
          nextChild.children.splice(
            0,
            0,
            fromDom(document.createTextNode(" ")) as HASTElement,
          );
        } else {
          helper(child as HASTParent);
        }
      }
    }
  };

  return helper;
}
