import { Mark } from "@tiptap/core";
import { MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes

const formatAttributionTitle = (
  action: string,
  userIds: readonly string[] | null,
  timestamp: number | null,
): string => {
  const who = userIds && userIds.length > 0 ? userIds.join(", ") : "unknown";
  const when =
    timestamp != null
      ? new Date(timestamp).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "unknown time";
  if (who === "unknown" && when === "unknown time") {
    return "";
  }
  return `${action} by ${who} on ${when}`;
};
export const SuggestionAddMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  // excludes: "", TODO: what's desired?
  addAttributes() {
    return {
      userIds: { default: null },
      timestamp: { default: null },
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
            "data-description":
              formatAttributionTitle(
                "Inserted",
                mark.attrs["userIds"],
                mark.attrs["timestamp"],
              ) || undefined,
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-timestamp": String(mark.attrs["timestamp"]),
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
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              timestamp: node.dataset["timestamp"]
                ? parseInt(node.dataset["timestamp"], 10)
                : null,
              "user-color": node.dataset["userColor"],
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
      timestamp: { default: null },
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

      toDOM(mark, inline) {
        return [
          "del",
          {
            "data-description":
              formatAttributionTitle(
                "Deleted",
                mark.attrs["userIds"],
                mark.attrs["timestamp"],
              ) || undefined,
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-timestamp": String(mark.attrs["timestamp"]),
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
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              timestamp: node.dataset["timestamp"]
                ? parseInt(node.dataset["timestamp"], 10)
                : null,
              "user-color": node.dataset["userColor"],
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
      timestamp: { default: null },
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
            "data-description":
              formatAttributionTitle(
                "Modified",
                mark.attrs["userIds"],
                mark.attrs["timestamp"],
              ) || undefined,
            "data-type": "modification",
            "data-user-ids": JSON.stringify(mark.attrs["userIds"]),
            "data-format": JSON.stringify(mark.attrs["format"]),
            "data-timestamp": String(mark.attrs["timestamp"]),
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
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              format: node.dataset["format"]
                ? JSON.parse(node.dataset["format"])
                : null,
              timestamp: node.dataset["timestamp"]
                ? parseInt(node.dataset["timestamp"], 10)
                : null,
              "user-color": node.dataset["userColor"],
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
              timestamp: node.dataset["timestamp"]
                ? parseInt(node.dataset["timestamp"], 10)
                : null,
              "user-color": node.dataset["userColor"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});
