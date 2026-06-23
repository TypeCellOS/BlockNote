import * as Y from "yjs";

import { BlockSchema } from "../../../../schema/index.js";
import { PreSyncMigrationRule } from "./migrationRule.js";

// Recursively traverses a `Y.XmlElement` and its descendant elements.
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

// Removes all formatting (marks) from a `Y.XmlText`. Returns whether anything
// was removed.
const stripFormatting = (text: Y.XmlText) => {
  const markKeys = new Set<string>();
  for (const op of text.toDelta() as {
    attributes?: Record<string, unknown>;
  }[]) {
    if (op.attributes) {
      for (const key of Object.keys(op.attributes)) {
        markKeys.add(key);
      }
    }
  }

  if (markKeys.size === 0) {
    return false;
  }

  // Setting each attribute to `null` removes that mark across the range.
  text.format(
    0,
    text.length,
    Object.fromEntries([...markKeys].map((key) => [key, null])),
  );

  return true;
};

// Strips marks from the text of `"plain"` content blocks (e.g. code blocks).
//
// Older documents may contain blocks whose content was previously `"inline"`
// (and so could hold marks like bold) but is now `"plain"` — whose ProseMirror
// node disallows marks (`marks: ""`). y-prosemirror does not strip disallowed
// marks; instead it rejects the whole node (`createChecked` throws) and its
// error handler DELETES that node from the Yjs document, propagating the
// deletion to all peers. This rule removes those marks from the fragment so the
// node stays valid and survives reconstruction (the text itself is preserved;
// only the formatting — which `"plain"` content cannot represent anyway — is
// dropped).
//
// Unlike the post-sync `MigrationRule`s, this must run BEFORE y-prosemirror
// reconstructs the document, so it mutates the Yjs fragment directly.
export const stripDisallowedMarks: PreSyncMigrationRule = (
  fragment,
  blockSchema: BlockSchema,
) => {
  const plainBlockTypes = new Set(
    Object.entries(blockSchema)
      .filter(([, config]) => config.content === "plain")
      .map(([type]) => type),
  );

  if (plainBlockTypes.size === 0) {
    return;
  }

  fragment.forEach((element) => {
    if (!(element instanceof Y.XmlElement)) {
      return;
    }

    traverseElement(element, (el) => {
      if (!plainBlockTypes.has(el.nodeName)) {
        return;
      }

      el.forEach((child) => {
        if (child instanceof Y.XmlText) {
          stripFormatting(child);
        }
      });
    });
  });
};
