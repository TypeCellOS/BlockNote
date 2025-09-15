import * as Y from "yjs";

import { MigrationRule } from "./migrationRule.js";
import { defaultProps } from "../../../../blocks/defaultProps.js";

// Helper function to recursively traverse a `Y.XMLElement` and its descendant
// elements.
const traverseElement = (
  rootElement: Y.XmlElement,
  cb: (element: Y.XmlElement) => void,
) => {
  cb(rootElement);
  rootElement.forEach((element) => {
    if (element instanceof Y.XmlElement) {
      traverseElement(element, cb);
    }
  });
};

// Moves `textColor` and `backgroundColor` attributes from `blockContainer`
// nodes to their child `blockContent` nodes. This is due to a schema change
// introduced in PR #TODO.
export const moveColorAttributes: MigrationRule = (fragment, tr) => {
  // Stores necessary info for all `blockContainer` nodes which still have
  // `textColor` or `backgroundColor` attributes that need to be moved.
  const targetBlockContainers: Record<
    string,
    {
      textColor?: string;
      backgroundColor?: string;
    }
  > = {};

  // Finds all elements which still have `textColor` or `backgroundColor`
  // attributes in the current Yjs fragment.
  fragment.forEach((element) => {
    if (element instanceof Y.XmlElement) {
      traverseElement(element, (element) => {
        if (
          element.nodeName === "blockContainer" &&
          element.hasAttribute("id")
        ) {
          const colors = {
            textColor: element.getAttribute("textColor"),
            backgroundColor: element.getAttribute("backgroundColor"),
          };

          if (colors.textColor === defaultProps.textColor.default) {
            colors.textColor = undefined;
          }
          if (colors.backgroundColor === defaultProps.backgroundColor.default) {
            colors.backgroundColor = undefined;
          }

          if (colors.textColor || colors.backgroundColor) {
            targetBlockContainers[element.getAttribute("id")!] = colors;
          }
        }
      });
    }
  });

  // Appends transactions to add the `textColor` and `backgroundColor`
  // attributes found on each `blockContainer` node to move them to the child
  // `blockContent` node.
  tr.doc.descendants((node, pos) => {
    if (
      node.type.name === "blockContainer" &&
      targetBlockContainers[node.attrs.id]
    ) {
      tr = tr.setNodeMarkup(
        pos + 1,
        undefined,
        targetBlockContainers[node.attrs.id],
      );
    }
  });
};
