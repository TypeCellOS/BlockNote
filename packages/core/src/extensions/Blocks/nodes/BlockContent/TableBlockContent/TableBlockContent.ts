import { Paragraph } from "@tiptap/extension-paragraph";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../../api/block";
import { defaultProps } from "../../../api/defaultProps";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers";

export const tablePropSchema = {
  ...defaultProps,
};

export const TableBlockContent = createStronglyTypedTiptapNode({
  name: "table",
  content: "tableRow+",
  group: "blockContent",
  tableRole: "table",

  isolating: true,

  parseHTML() {
    return [{ tag: "table" }];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      "table",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

const TableParagraph = Paragraph.extend({
  name: "tableParagraph",
  group: "tableContent",
});

export const Table = createBlockSpecFromStronglyTypedTiptapNode(
  TableBlockContent,
  tablePropSchema,
  [
    TableParagraph,
    TableHeader.extend({
      content: "tableContent",
    }),
    TableCell.extend({
      content: "tableContent",
    }),
    TableRow,
  ]
);
