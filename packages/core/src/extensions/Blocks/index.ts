import { Node } from "@tiptap/core";
import { BlockContainer } from "./nodes/BlockContainer";
import { BlockGroup } from "./nodes/BlockGroup";

export const blocks: any[] = [
  // TableContent,
  // TableRow,
  // TableCol,
  BlockContainer,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
