import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { createInlineContentSpec } from "./createSpec.js";

const customPlainIC = createInlineContentSpec(
  { type: "customPlainIC", propSchema: {}, content: "plain" },
  {
    parse: (element) =>
      element.classList.contains("custom-plain-ic") ? {} : undefined,
    render() {
      const dom = document.createElement("span");
      const contentDOM = document.createElement("span");
      dom.append(contentDOM);
      return { dom, contentDOM };
    },
  },
);

export function createPlainInlineSchema() {
  return BlockNoteSchema.create().extend({
    inlineContentSpecs: { customPlainIC },
  });
}
