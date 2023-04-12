import { Node } from "@tiptap/core";
import { BlockContainer } from "./nodes/BlockContainer";
import { TableCol } from "./nodes/BlockContent/TableContent/TableCol";
import { TableContent } from "./nodes/BlockContent/TableContent/TableContent";
import { TableRow } from "./nodes/BlockContent/TableContent/TableRow";
import { BlockGroup } from "./nodes/BlockGroup";

export const blocks: any[] = [
  TableContent,
  TableRow,
  TableCol,
  BlockContainer,
  BlockGroup,
  Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
  }),
];
