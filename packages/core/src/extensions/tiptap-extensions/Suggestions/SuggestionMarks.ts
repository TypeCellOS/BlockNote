import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes

const formatAttributionTitle = (
  userIds: readonly string[] | null,
): string | undefined => {
  if (userIds && userIds.length > 0) {
    return userIds.join(", ");
  }
  return undefined;
};

export const SuggestionAddMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  // excludes: "", TODO: what's desired?
  addAttributes() {
    return {
      userIds: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
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
            "data-description": formatAttributionTitle(mark.attrs["userIds"]),
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-user-color-light": String(mark.attrs["user-color-light"]),
            "data-user-color-dark": String(mark.attrs["user-color-dark"]),
            "data-inline": String(inline),
            style:
              (inline ? "" : "display: contents") +
              `; --user-color-light: ${mark.attrs["user-color-light"]}; --user-color-dark: ${mark.attrs["user-color-dark"]}`,
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "ins",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
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
  // excludes: "", TODO: what's desired?
  addAttributes() {
    return {
      userIds: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
    };
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-delete") {
      return {};
    }
    return {
      blocknoteIgnore: true,
      inclusive: false,

      toDOM(mark, inline) {
        return [
          "del",
          {
            "data-description": formatAttributionTitle(mark.attrs["userIds"]),
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-user-color-light": String(mark.attrs["user-color-light"]),
            "data-user-color-dark": String(mark.attrs["user-color-dark"]),
            "data-inline": String(inline),
            style:
              (inline ? "" : "display: contents") +
              `; --user-color-light: ${mark.attrs["user-color-light"]}; --user-color-dark: ${mark.attrs["user-color-dark"]}`,
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "del",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
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
  // excludes: "", TODO: what's desired?
  addAttributes() {
    return {
      userIds: { default: null },
      format: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
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
            "data-description": formatAttributionTitle(mark.attrs["userIds"]),
            "data-type": "modification",
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-format": JSON.stringify(mark.attrs["format"]),
            "data-user-color-light": String(mark.attrs["user-color-light"]),
            "data-user-color-dark": String(mark.attrs["user-color-dark"]),
            style:
              (inline ? "" : "display: contents") +
              `; --user-color-light: ${mark.attrs["user-color-light"]}; --user-color-dark: ${mark.attrs["user-color-dark"]}`,
          },
          0,
        ];
      },
      parseDOM: [
        {
          tag: "span[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              format: node.dataset["format"]
                ? JSON.parse(node.dataset["format"])
                : null,
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
        {
          tag: "div[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              format: node.dataset["format"]
                ? JSON.parse(node.dataset["format"])
                : null,
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});
