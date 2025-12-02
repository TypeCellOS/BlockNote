import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentMark = Mark.create({
  name: "comment",
  excludes: "",
  inclusive: false,
  keepOnSplit: true,

  addAttributes() {
    // Return an object with attribute configuration
    return {
      // orphans are marks that currently don't have an active thread. It could be
      // that users have resolved the thread. Resolved threads by default are not shown in the document,
      // but we need to keep the mark (positioning) data so we can still "revive" it when the thread is unresolved
      // or we enter a "comments" view that includes resolved threads.
      orphan: {
        parseHTML: (element) => !!element.getAttribute("data-orphan"),
        renderHTML: (attributes) => {
          return (attributes as { orphan: boolean }).orphan
            ? {
                "data-orphan": "true",
              }
            : {};
        },
        default: false,
      },
      threadId: {
        parseHTML: (element) => element.getAttribute("data-bn-thread-id"),
        renderHTML: (attributes) => {
          return {
            "data-bn-thread-id": (attributes as { threadId: string }).threadId,
          };
        },
        default: "",
      },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "bn-thread-mark",
      }),
    ];
  },

  parseHTML() {
    return [{ tag: "span.bn-thread-mark" }];
  },

  extendMarkSchema(extension) {
    if (extension.name === "comment") {
      return {
        blocknoteIgnore: true,
      };
    }
    return {};
  },
});
