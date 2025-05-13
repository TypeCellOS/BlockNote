import { Node, mergeAttributes } from "@tiptap/core";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { DOMParser, Fragment, Node as PMNode, Schema } from "prosemirror-model";
import { TableView } from "prosemirror-tables";
import { NodeView } from "prosemirror-view";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { mergeCSSClasses } from "../../util/browser.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { EMPTY_CELL_WIDTH, TableExtension } from "./TableExtension.js";

export const tablePropSchema = {
  textColor: defaultProps.textColor,
};

export const TableBlockContent = createStronglyTypedTiptapNode({
  name: "table",
  content: "tableRow+",
  group: "blockContent",
  tableRole: "table",

  marks: "deletion insertion modification",
  isolating: true,

  parseHTML() {
    return [
      {
        tag: "table",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      "table",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {},
    );
  },

  // This node view is needed for the `columnResizing` plugin. By default, the
  // plugin adds its own node view, which overrides how the node is rendered vs
  // `renderHTML`. This means that the wrapping `blockContent` HTML element is
  // no longer rendered. The `columnResizing` plugin uses the `TableView` as its
  // default node view. `BlockNoteTableView` extends it by wrapping it in a
  // `blockContent` element, so the DOM structure is consistent with other block
  // types.
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      class BlockNoteTableView extends TableView {
        constructor(
          public node: PMNode,
          public cellMinWidth: number,
          public blockContentHTMLAttributes: Record<string, string>,
        ) {
          super(node, cellMinWidth);

          const blockContent = document.createElement("div");
          blockContent.className = mergeCSSClasses(
            "bn-block-content",
            blockContentHTMLAttributes.class,
          );
          blockContent.setAttribute("data-content-type", "table");
          for (const [attribute, value] of Object.entries(
            blockContentHTMLAttributes,
          )) {
            if (attribute !== "class") {
              blockContent.setAttribute(attribute, value);
            }
          }

          const tableWrapper = this.dom;

          const tableWrapperInner = document.createElement("div");
          tableWrapperInner.className = "tableWrapper-inner";
          tableWrapperInner.appendChild(tableWrapper.firstChild!);

          tableWrapper.appendChild(tableWrapperInner);

          blockContent.appendChild(tableWrapper);
          const floatingContainer = document.createElement("div");
          floatingContainer.className = "table-widgets-container";
          floatingContainer.style.position = "relative";
          tableWrapper.appendChild(floatingContainer);

          this.dom = blockContent;
        }

        ignoreMutation(record: MutationRecord): boolean {
          return (
            !(record.target as HTMLElement).closest(".tableWrapper-inner") ||
            super.ignoreMutation(record)
          );
        }
      }

      return new BlockNoteTableView(node, EMPTY_CELL_WIDTH, {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      }) as NodeView; // needs cast, tiptap types (wrongly) doesn't support return tableview here
    };
  },
});

const TableParagraph = createStronglyTypedTiptapNode({
  name: "tableParagraph",
  group: "tableContent",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        getAttrs: (element) => {
          if (typeof element === "string" || !element.textContent) {
            return false;
          }

          // Only parse in internal HTML.
          if (!element.closest("[data-content-type]")) {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.tagName === "TD" || parent.tagName === "TH") {
            return {};
          }

          return false;
        },
        node: "tableParagraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", HTMLAttributes, 0];
  },
});

/**
 * This extension allows you to create table rows.
 * @see https://www.tiptap.dev/api/nodes/table-row
 */
export const TableRow = Node.create<{ HTMLAttributes: Record<string, any> }>({
  name: "tableRow",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "(tableCell | tableHeader)+",

  tableRole: "row",
  marks: "deletion insertion modification",
  parseHTML() {
    return [{ tag: "tr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "tr",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

/*
 * This will flatten a node's content to fit into a table cell's paragraph.
 */
function parseTableContent(node: HTMLElement, schema: Schema) {
  const parser = DOMParser.fromSchema(schema);

  // This will parse the content of the table paragraph as though it were a blockGroup.
  // Resulting in a structure like:
  // <blockGroup>
  //   <blockContainer>
  //     <p>Hello</p>
  //   </blockContainer>
  //   <blockContainer>
  //     <p>Hello</p>
  //   </blockContainer>
  // </blockGroup>
  const parsedContent = parser.parse(node, {
    topNode: schema.nodes.blockGroup.create(),
  });
  const extractedContent: PMNode[] = [];

  // Try to extract any content within the blockContainer.
  parsedContent.content.descendants((child) => {
    // As long as the child is an inline node, we can append it to the fragment.
    if (child.isInline) {
      // And append it to the fragment
      extractedContent.push(child);
      return false;
    }

    return undefined;
  });

  return Fragment.fromArray(extractedContent);
}

export const Table = createBlockSpecFromStronglyTypedTiptapNode(
  TableBlockContent,
  tablePropSchema,
  [
    TableExtension,
    TableParagraph,
    TableHeader.extend({
      /**
       * We allow table headers and cells to have multiple tableContent nodes because
       * when merging cells, prosemirror-tables will concat the contents of the cells naively.
       * This would cause that content to overflow into other cells when prosemirror tries to enforce the cell structure.
       *
       * So, we manually fix this up when reading back in the `nodeToBlock` and only ever place a single tableContent back into the cell.
       */
      content: "tableContent+",
      parseHTML() {
        return [
          {
            tag: "th",
            // As `th` elements can contain multiple paragraphs, we need to merge their contents
            // into a single one so that ProseMirror can parse everything correctly.
            getContent: (node, schema) =>
              parseTableContent(node as HTMLElement, schema),
          },
        ];
      },
    }),
    TableCell.extend({
      content: "tableContent+",
      parseHTML() {
        return [
          {
            tag: "td",
            // As `td` elements can contain multiple paragraphs, we need to merge their contents
            // into a single one so that ProseMirror can parse everything correctly.
            getContent: (node, schema) =>
              parseTableContent(node as HTMLElement, schema),
          },
        ];
      },
    }),
    TableRow,
  ],
);
