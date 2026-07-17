import {
  BLOCK_LEVEL_SUGGESTION_GROUP,
  NON_FORMATTING_MARK_GROUP,
  createExtension,
} from "@blocknote/core";
import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes
export const SuggestionAddMark = Mark.create({
  name: "insertion",
  inclusive: false,
  excludes: "deletion modification insertion",
  // Two groups: `BLOCK_LEVEL_SUGGESTION_GROUP` lets the mark sit on block nodes
  // (see core's `suggestionMarks`), so a whole block (e.g. a table row) can be
  // marked as inserted in suggestion mode; `NON_FORMATTING_MARK_GROUP` lets it
  // annotate text inside `"plain"` blocks (e.g. code blocks) — see core's
  // `nonFormattingMarks`.
  group: `${BLOCK_LEVEL_SUGGESTION_GROUP} ${NON_FORMATTING_MARK_GROUP}`,
  addAttributes() {
    return {
      id: { default: null, validate: "number" }, // note: validate is supported in prosemirror but not in tiptap, so this doesn't actually work (considered not critical)
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "insertion") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,

      toDOM(mark, inline) {
        return [
          "ins",
          {
            "data-id": String(mark.attrs["id"]),
            "data-inline": String(inline),
            ...(!inline && { style: "display: contents" }), // changed to "contents" to make this work for table rows
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "ins",
          getAttrs(node) {
            if (!node.dataset["id"]) {
              return false;
            }
            return {
              id: parseInt(node.dataset["id"], 10),
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionDeleteMark = Mark.create({
  name: "deletion",
  inclusive: false,
  excludes: "insertion modification deletion",
  group: `${BLOCK_LEVEL_SUGGESTION_GROUP} ${NON_FORMATTING_MARK_GROUP}`,
  addAttributes() {
    return {
      id: { default: null, validate: "number" }, // note: validate is supported in prosemirror but not in tiptap
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "deletion") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,

      // attrs: {
      //   id: { validate: "number" },
      // },
      toDOM(mark, inline) {
        return [
          "del",
          {
            "data-id": String(mark.attrs["id"]),
            "data-inline": String(inline),
            ...(!inline && { style: "display: contents" }), // changed to "contents" to make this work for table rows
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "del",
          getAttrs(node) {
            if (!node.dataset["id"]) {
              return false;
            }
            return {
              id: parseInt(node.dataset["id"], 10),
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionModificationMark = Mark.create({
  name: "modification",
  inclusive: false,
  excludes: "deletion insertion",
  group: `${BLOCK_LEVEL_SUGGESTION_GROUP} ${NON_FORMATTING_MARK_GROUP}`,
  addAttributes() {
    // note: validate is supported in prosemirror but not in tiptap
    return {
      id: { default: null, validate: "number" },
      type: { validate: "string" },
      attrName: { default: null, validate: "string|null" },
      previousValue: { default: null },
      newValue: { default: null },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "modification") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      // attrs: {
      //   id: { validate: "number" },
      //   type: { validate: "string" },
      //   attrName: { default: null, validate: "string|null" },
      //   previousValue: { default: null },
      //   newValue: { default: null },
      // },
      toDOM(mark, inline) {
        return [
          inline ? "span" : "div",
          {
            "data-type": "modification",
            "data-id": String(mark.attrs["id"]),
            "data-mod-type": mark.attrs["type"] as string,
            "data-mod-prev-val": JSON.stringify(mark.attrs["previousValue"]),
            // TODO: Try to serialize marks with toJSON?
            "data-mod-new-val": JSON.stringify(mark.attrs["newValue"]),
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "span[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["id"]) {
              return false;
            }
            return {
              id: parseInt(node.dataset["id"], 10),
              type: node.dataset["modType"],
              previousValue: node.dataset["modPrevVal"],
              newValue: node.dataset["modNewVal"],
            };
          },
        },
        {
          tag: "div[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["id"]) {
              return false;
            }
            return {
              id: parseInt(node.dataset["id"], 10),
              type: node.dataset["modType"],
              previousValue: node.dataset["modPrevVal"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

/**
 * Bundles the three AI suggestion marks (`insertion` / `deletion` /
 * `modification`) into a single BlockNote extension, so they can be registered
 * in one line wherever they're needed (the AI extension, or a test that
 * exercises suggestions). The marks opt into being allowed on block nodes via
 * their `blockLevelSuggestion` option — see core's `suggestionMarks`.
 */
export const AttributionMarksExtension = createExtension(() => ({
  key: "aiAttributionMarks",
  tiptapExtensions: [
    SuggestionAddMark,
    SuggestionDeleteMark,
    SuggestionModificationMark,
  ],
}));
