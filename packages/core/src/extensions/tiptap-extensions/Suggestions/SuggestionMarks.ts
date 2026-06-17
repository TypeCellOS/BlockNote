import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes
export const SuggestionAddMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  excludes: "",
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
  excludes: "",
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
  excludes: "",
  addAttributes() {
    return {
      id: { default: null, validate: "number" }, // note: validate is supported in prosemirror but not in tiptap
      "user-color": { default: null, validate: "string" },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-format") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      toDOM(mark, inline) {
        return [
          inline ? "span" : "div",
          {
            "data-type": "modification",
            "data-id": String(mark.attrs["id"]),
            "data-user-color": String(mark.attrs["user-color"]),
            style:
              (inline ? "" : "display: contents") +
              ("user-color" in mark.attrs
                ? `; --user-color: ${mark.attrs["user-color"]}`
                : ""),
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
              "user-color": node.dataset["userColor"],
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
              "user-color": node.dataset["userColor"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});
