import { NodeType, Schema } from "@tiptap/pm/model";
import * as Y from "yjs";

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

// Removes the marks that `nodeType` doesn't allow (and any marks that aren't in
// the schema at all) from a `Y.XmlText`.
const stripDisallowedFromText = (
  text: Y.XmlText,
  nodeType: NodeType,
  schema: Schema,
) => {
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

  const keysToStrip = [...markKeys].filter((key) => {
    // y-prosemirror encodes "overlapping" marks (those that don't exclude
    // themselves, e.g. comments) as `${markName}--${hash}` so multiple
    // instances can coexist on a range. Resolve the base mark name before
    // looking it up in the schema.
    const markName = key.split("--")[0];
    const markType = schema.marks[markName];
    return !markType || !nodeType.allowsMarkType(markType);
  });

  if (keysToStrip.length === 0) {
    return;
  }

  // Setting each attribute to `null` removes that mark across the range.
  text.format(
    0,
    text.length,
    Object.fromEntries(keysToStrip.map((key) => [key, null])),
  );
};

// Strips marks a node's ProseMirror type doesn't allow from its text.
//
// Older documents may contain blocks whose content was previously `"inline"`
// (and so could hold formatting marks like bold) but is now `"plain"` — whose
// node only allows the non-formatting marks (comments and suggestions/diffs,
// via the `NON_FORMATTING_MARK_GROUP`). y-prosemirror does not strip disallowed
// marks; instead it rejects the whole node (`createChecked` throws) and its
// error handler DELETES that node from the Yjs document, propagating the
// deletion to all peers. This rule removes the disallowed marks from the
// fragment so the node stays valid and survives reconstruction — preserving the
// text as well as any marks the node still allows.
//
// Whether a mark is allowed is read straight from the schema
// (`NodeType.allowsMarkType`), so no list of mark names needs to be maintained.
//
// Unlike the post-sync `MigrationRule`s, this must run BEFORE y-prosemirror
// reconstructs the document, so it mutates the Yjs fragment directly.
export const stripDisallowedMarks: PreSyncMigrationRule = (
  fragment,
  schema,
) => {
  fragment.forEach((element) => {
    if (!(element instanceof Y.XmlElement)) {
      return;
    }

    traverseElement(element, (el) => {
      const nodeType = schema.nodes[el.nodeName];
      if (!nodeType) {
        return;
      }

      el.forEach((child) => {
        if (child instanceof Y.XmlText) {
          stripDisallowedFromText(child, nodeType, schema);
        }
      });
    });
  });
};
