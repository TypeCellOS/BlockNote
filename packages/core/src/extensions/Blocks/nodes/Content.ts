import { mergeAttributes, Node } from "@tiptap/core";
export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export const ContentBlock = Node.create<IBlock>({
  name: "tccontent",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
