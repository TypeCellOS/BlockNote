import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes
export const SuggestionAddMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  excludes: "y-attributed-delete y-attributed-format y-attributed-insert",
  addAttributes() {
    return {
      id: { default: null, validate: "number" }, // note: validate is supported in prosemirror but not in tiptap, so this doesn't actually work (considered not critical)
      "user-color": { default: null, validate: "string" },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-insert") {
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
            "data-user-color": String(mark.attrs["user-color"]),
            "data-inline": String(inline),
            style:
              (inline ? "" : "display: contents") +
              ("user-color" in mark.attrs
                ? `; --user-color: ${mark.attrs["user-color"]}`
                : ""), // changed to "contents" to make this work for table rows
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
              userColor: node.dataset["userColor"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionDeleteMark = Mark.create({
  name: "y-attributed-delete",
  inclusive: false,
  excludes: "y-attributed-delete y-attributed-format y-attributed-insert",
  addAttributes() {
    return {
      id: { default: null, validate: "number" }, // note: validate is supported in prosemirror but not in tiptap
      "user-color": { default: null, validate: "string" },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-delete") {
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
            "data-user-color": String(mark.attrs["user-color"]),
            "data-inline": String(inline),
            style:
              (inline ? "" : "display: contents") +
              ("user-color" in mark.attrs
                ? `; --user-color: ${mark.attrs["user-color"]}`
                : ""), // changed to "contents" to make this work for table rows
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
              userColor: node.dataset["userColor"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionModificationMark = Mark.create({
  name: "y-attributed-format",
  inclusive: false,
  excludes: "y-attributed-delete y-attributed-format y-attributed-insert",
  addAttributes() {
    // note: validate is supported in prosemirror but not in tiptap
    return {
      id: { default: null, validate: "number" },
      "user-color": { default: null, validate: "string" },
      type: { validate: "string" },
      attrName: { default: null, validate: "string|null" },
      previousValue: { default: null },
      newValue: { default: null },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-format") {
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
            "data-user-color": String(mark.attrs["user-color"]),
            "data-mod-type": mark.attrs["type"] as string,
            "data-mod-prev-val": JSON.stringify(mark.attrs["previousValue"]),
            // TODO: Try to serialize marks with toJSON?
            "data-mod-new-val": JSON.stringify(mark.attrs["newValue"]),
            style:
              "user-color" in mark.attrs
                ? ` --user-color: ${mark.attrs["user-color"]}`
                : "", // changed to "contents" to make this work for table rows
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
              userColor: node.dataset["userColor"],
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
