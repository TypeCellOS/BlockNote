import { Node } from "@tiptap/core";
export { BlockContainer } from "./nodes/BlockContainer";
export { BlockGroup } from "./nodes/BlockGroup";
export { SlideGroup, Slide } from "./nodes/SlideGroup";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  content: "slideGroup",
});
