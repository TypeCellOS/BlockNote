import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentMark = Mark.create({
  name: "comment",
  excludes: "",
  inclusive: false,
  keepOnSplit: true,
  group: "blocknoteIgnore", // ignore in blocknote json

  addAttributes() {
    // Return an object with attribute configuration
    return {
      // TODO: check if needed
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
});
