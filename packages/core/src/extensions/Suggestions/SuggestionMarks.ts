import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

export const SuggestionAddMark = Mark.create({
  name: "insertion",
  inclusive: false,
  extendMarkSchema(extension) {
    if (extension.name !== "insertion") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      excludes: "deletion modification insertion",
      attrs: {
        id: { validate: "number" },
      },
      toDOM(mark, inline) {
        return [
          "ins",
          {
            "data-id": String(mark.attrs["id"]),
            "data-inline": String(inline),
            ...(!inline && { style: "display: block" }),
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "ins",
          getAttrs(node) {
            if (!node.dataset["id"]) return false;
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

  extendMarkSchema(extension) {
    if (extension.name !== "deletion") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,

      excludes: "insertion modification deletion",
      attrs: {
        id: { validate: "number" },
      },
      toDOM(mark, inline) {
        return [
          "del",
          {
            "data-id": String(mark.attrs["id"]),
            "data-inline": String(inline),
            ...(!inline && { style: "display: block" }),
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "del",
          getAttrs(node) {
            if (!node.dataset["id"]) return false;
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

  extendMarkSchema(extension) {
    if (extension.name !== "modification") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,
      excludes: "deletion insertion",
      attrs: {
        id: { validate: "number" },
        type: { validate: "string" },
        attrName: { default: null, validate: "string|null" },
        previousValue: { default: null },
        newValue: { default: null },
      },
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
            if (!node.dataset["id"]) return false;
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
            if (!node.dataset["id"]) return false;
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
