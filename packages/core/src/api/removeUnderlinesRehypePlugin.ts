import { Element as HASTElement, Parent as HASTParent } from "hast";

export function removeUnderlines() {
  const removeUnderlinesHelper = (tree: HASTParent) => {
    let numChildElements = tree.children.length;

    for (let i = 0; i < numChildElements; i++) {
      const node = tree.children[i];

      if (node.type === "element") {
        removeUnderlinesHelper(node);

        if ((node as HASTElement).tagName === "u") {
          if (node.children.length > 0) {
            tree.children.splice(i, 1, ...node.children);

            const numElementsAdded = node.children.length - 1;
            numChildElements += numElementsAdded;
            i += numElementsAdded;
          } else {
            tree.children.splice(i, 1);

            numChildElements--;
            i--;
          }
        }
      }
    }
  };

  return removeUnderlinesHelper;
}
