import { Node, mergeAttributes } from "@tiptap/core";
import { DOMParser, Fragment, Node as PMNode, Schema } from "prosemirror-model";
import { CellSelection, TableView } from "prosemirror-tables";
import { NodeView } from "prosemirror-view";
import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  BlockConfig,
  createBlockSpecFromTiptapNode,
  TableContent,
} from "../../schema/index.js";
import { mergeCSSClasses } from "../../util/browser.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { EMPTY_CELL_WIDTH, TableExtension } from "./TableExtension.js";

export const tablePropSchema = {
  textColor: defaultProps.textColor,
};

const TiptapTableHeader = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
  name: "tableHeader",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  /**
   * We allow table headers and cells to have multiple tableContent nodes because
   * when merging cells, prosemirror-tables will concat the contents of the cells naively.
   * This would cause that content to overflow into other cells when prosemirror tries to enforce the cell structure.
   *
   * So, we manually fix this up when reading back in the `nodeToBlock` and only ever place a single tableContent back into the cell.
   */
  content: "tableContent+",

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth
            ? colwidth.split(",").map((width) => parseInt(width, 10))
            : null;

          return value;
        },
      },
    };
  },

  tableRole: "header_cell",

  isolating: true,

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

  renderHTML({ HTMLAttributes }) {
    return [
      "th",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

const TiptapTableCell = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
  name: "tableCell",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "tableContent+",

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth
            ? colwidth.split(",").map((width) => parseInt(width, 10))
            : null;

          return value;
        },
      },
    };
  },

  tableRole: "cell",

  isolating: true,

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

  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

const TiptapTableNode = Node.create({
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

  renderHTML({ node, HTMLAttributes }) {
    const domOutputSpec = createDefaultBlockDOMOutputSpec(
      this.name,
      "table",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {},
    );

    // Need to manually add colgroup element
    const colGroup = document.createElement("colgroup");
    for (const tableCell of node.children[0].children) {
      const colWidths: null | (number | undefined)[] =
        tableCell.attrs["colwidth"];

      if (colWidths) {
        for (const colWidth of tableCell.attrs["colwidth"]) {
          const col = document.createElement("col");
          if (colWidth) {
            col.style = `width: ${colWidth}px`;
          }

          colGroup.appendChild(col);
        }
      } else {
        colGroup.appendChild(document.createElement("col"));
      }
    }

    domOutputSpec.dom.firstChild?.appendChild(colGroup);

    return domOutputSpec;
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

const TiptapTableParagraph = Node.create({
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
const TiptapTableRow = Node.create<{
  HTMLAttributes: Record<string, any>;
}>({
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

export type TableBlockConfig = BlockConfig<
  "table",
  {
    textColor: {
      default: "default";
    };
  },
  "table"
>;

export const createTableBlockSpec = () =>
  createBlockSpecFromTiptapNode(
    { node: TiptapTableNode, type: "table", content: "table" },
    tablePropSchema,
    [
      createBlockNoteExtension({
        key: "table-extensions",
        tiptapExtensions: [
          TableExtension,
          TiptapTableParagraph,
          TiptapTableHeader,
          TiptapTableCell,
          TiptapTableRow,
        ],
      }),
      // Extension for keyboard shortcut which deletes the table if it's empty
      // and all cells are selected. Uses a separate extension as it needs
      // priority over keyboard handlers in the `TableExtension`'s
      // `tableEditing` plugin.
      createBlockNoteExtension({
        key: "table-keyboard-delete",
        keyboardShortcuts: {
          Backspace: ({ editor }) => {
            if (!(editor.prosemirrorState.selection instanceof CellSelection)) {
              return false;
            }

            const block = editor.getTextCursorPosition().block;
            const content = block.content as TableContent<any, any>;

            let numCells = 0;
            for (const row of content.rows) {
              for (const cell of row.cells) {
                // Returns `false` if any cell isn't empty.
                if (
                  ("type" in cell && cell.content.length > 0) ||
                  (!("type" in cell) && cell.length > 0)
                ) {
                  return false;
                }

                numCells++;
              }
            }

            // Need to use ProseMirror API to check number of selected cells.
            let selectionNumCells = 0;
            editor.prosemirrorState.selection.forEachCell(() => {
              selectionNumCells++;
            });

            if (selectionNumCells < numCells) {
              return false;
            }

            editor.transact(() => {
              const selectionBlock =
                editor.getPrevBlock(block) || editor.getNextBlock(block);
              if (selectionBlock) {
                editor.setTextCursorPosition(block);
              }

              editor.removeBlocks([block]);
            });

            return true;
          },
        },
      }),
    ],
  );

// We need to declare this here because we aren't using the table extensions from tiptap, so the types are not automatically inferred.
declare module "@tiptap/core" {
  interface NodeConfig {
    tableRole?: string;
  }
}
