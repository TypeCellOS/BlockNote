import { Node } from "@tiptap/core";
import { BlockContainer } from "./nodes/BlockContainer";
import { BlockGroup } from "./nodes/BlockGroup";

export const blocks: any[] = [
  BlockContainer,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
