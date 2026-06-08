import * as Y from "@y/y";

import { MigrationRule } from "./migrationRule.js";
import { defaultProps } from "../../../../blocks/defaultProps.js";

// Helper function to recursively traverse an XML-element-like `Y.Type` and its
// descendant elements. In Yjs v14 both XML elements and XML text nodes are
// represented by the unified `Y.Type`; element nodes have a tag `name` while
// text nodes have a `null` name, so we use that to skip text nodes.
const traverseElement = (
  rootElement: Y.Type,
  cb: (element: Y.Type) => void,
) => {
  cb(rootElement);
  rootElement.forEach((element) => {
    if (element instanceof Y.Type && element.name != null) {
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
  const targetBlockContainers: Map<
    string,
    {
      textColor: string | undefined;
      backgroundColor: string | undefined;
    }
  > = new Map();
  // Finds all elements which still have `textColor` or `backgroundColor`
  // attributes in the current Yjs fragment.
  fragment.forEach((element) => {
    if (element instanceof Y.Type && element.name != null) {
      traverseElement(element, (element) => {
        if (
          element.name === "blockContainer" &&
          element.hasAttr("id")
        ) {
          const textColor = element.getAttr("textColor");
          const backgroundColor = element.getAttr("backgroundColor");

          const colors = {
            textColor:
              textColor === defaultProps.textColor.default
                ? undefined
                : textColor,
            backgroundColor:
              backgroundColor === defaultProps.backgroundColor.default
                ? undefined
                : backgroundColor,
          };

          if (colors.textColor || colors.backgroundColor) {
            targetBlockContainers.set(element.getAttr("id")!, colors);
          }
        }
      });
    }
  });

  if (targetBlockContainers.size === 0) {
    return false;
  }

  // Appends transactions to add the `textColor` and `backgroundColor`
  // attributes found on each `blockContainer` node to move them to the child
  // `blockContent` node.
  tr.doc.descendants((node, pos) => {
    if (
      node.type.name === "blockContainer" &&
      targetBlockContainers.has(node.attrs.id)
    ) {
      const el = tr.doc.nodeAt(pos + 1);
      if (!el) {
        throw new Error("No element found");
      }

      tr.setNodeMarkup(pos + 1, undefined, {
        // preserve existing attributes
        ...el.attrs,
        // add the textColor and backgroundColor attributes
        ...targetBlockContainers.get(node.attrs.id),
      });
    }
  });

  return true;
};
