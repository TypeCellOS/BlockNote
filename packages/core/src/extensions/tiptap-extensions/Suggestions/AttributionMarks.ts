import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// The three canonical attribution marks for the y-prosemirror binding
// (suggestion mode + version diffs). The names `y-attributed-insert` /
// `y-attributed-delete` / `y-attributed-format` are part of y-prosemirror's
// contract and MUST NOT be renamed: the binding's strip step and its
// accept/reject commands reference them by name. See y-prosemirror
// ATTRIBUTION.md / CAVEATS.md.
//
// These are deliberately SEPARATE from BlockNote's `insertion` / `deletion` /
// `modification` marks (SuggestionMarks.ts). Those exist for the
// `@handlewithcare/prosemirror-suggest-changes` engine that xl-ai builds on and
// are pinned to those exact names. The binding-driven attribution and the
// xl-ai-driven suggestions are, for now, two parallel systems. Unifying them
// would mean migrating xl-ai off `@handlewithcare/prosemirror-suggest-changes`
// onto the binding's attribution manager.
//
// Schema rules (verified against the binding's reference schema,
// tests/complexSchema.js):
//   - `excludes` is left at the DEFAULT (self-exclusion). NOT `excludes: ''`.
//     Default self-exclusion makes re-applying a kind on a span REPLACE the
//     prior instance (when `userIds` change between renders) instead of stacking
//     duplicates and churning the reconcile loop. The three are different mark
//     TYPES, so they already compose with each other.
//   - Declared `attrs` MUST match exactly what the binding's
//     `defaultMapAttributionToMark` emits, or the PM<->Y reconcile diff is never
//     empty and the sync plugin loops:
//       insert / delete -> { userIds, timestamp }
//       format          -> { userIds, userIdsByAttr, timestamp }

export const AttributedInsertMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  addAttributes() {
    return {
      userIds: { default: null },
      timestamp: { default: null },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-insert") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      toDOM(_mark, inline) {
        return [
          "ins",
          {
            "data-attributed": "insert",
            "data-inline": String(inline),
            // "display: contents" lets a block-level (node) mark wrap without a
            // layout box, matching the suggestion-mark / table-row treatment.
            ...(!inline && { style: "display: contents" }),
          },
          0,
        ];
      },
      parseDOM: [{ tag: "ins[data-attributed='insert']" }],
    } satisfies MarkSpec;
  },
});

export const AttributedDeleteMark = Mark.create({
  name: "y-attributed-delete",
  inclusive: false,
  addAttributes() {
    return {
      userIds: { default: null },
      timestamp: { default: null },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-delete") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      toDOM(_mark, inline) {
        return [
          "del",
          {
            "data-attributed": "delete",
            "data-inline": String(inline),
            ...(!inline && { style: "display: contents" }),
          },
          0,
        ];
      },
      parseDOM: [{ tag: "del[data-attributed='delete']" }],
    } satisfies MarkSpec;
  },
});

export const AttributedFormatMark = Mark.create({
  name: "y-attributed-format",
  inclusive: false,
  addAttributes() {
    return {
      userIds: { default: null },
      userIdsByAttr: { default: null },
      timestamp: { default: null },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-format") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      toDOM(_mark, inline) {
        return [
          inline ? "span" : "div",
          {
            "data-type": "y-attributed-format",
            ...(!inline && { style: "display: contents" }),
          },
          0,
        ];
      },
      parseDOM: [
        { tag: "span[data-type='y-attributed-format']" },
        { tag: "div[data-type='y-attributed-format']" },
      ],
    } satisfies MarkSpec;
  },
});
