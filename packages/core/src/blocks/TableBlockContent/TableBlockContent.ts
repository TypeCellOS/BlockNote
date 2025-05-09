import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Node as PMNode, DOMParser } from "prosemirror-model";
import { TableView } from "prosemirror-tables";

import { NodeView } from "prosemirror-view";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { mergeCSSClasses } from "../../util/browser.js";
import {
  createDefaultBlockDOMOutputSpec,
  mergeParagraphs,
} from "../defaultBlockHelpers.js";
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
      this.options.domAttributes?.inlineContent || {}
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
          public blockContentHTMLAttributes: Record<string, string>
        ) {
          super(node, cellMinWidth);

          const blockContent = document.createElement("div");
          blockContent.className = mergeCSSClasses(
            "bn-block-content",
            blockContentHTMLAttributes.class
          );
          blockContent.setAttribute("data-content-type", "table");
          for (const [attribute, value] of Object.entries(
            blockContentHTMLAttributes
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
            getContent: (node, schema) => {
              mergeParagraphs(node as HTMLElement);

              const parser = DOMParser.fromSchema(schema);

              const parentNode = parser.parse(
                (node as HTMLElement).querySelector("p") || node,
                {
                  topNode: schema.nodes[this.name].create(),
                }
              );

              return parentNode.content;

              // /**
              //  * IDK something like this
              //  * This will help with merging table cell content together.
              //  */

              // // Use a table cell to append the content into.
              // let td = schema.nodes.tableCell.create({});
              // // If we want, we can also keep track of content that can't be appended. (e.g. images can still be preserved, outside the table cell)
              // const cantAppend: Node[] = [];

              // parsedContent.children.forEach((child) => {
              //   // Do something similar, where we iterate the blockContainers, and see if we can append their content into the table cell.
              //   const content = child.firstChild!;
              //   console.log("child", content?.toString());
              //   if (td.canAppend(content)) {
              //     // If we can append the content, we do so.
              //     console.log("can append");
              //     td = td.copy(td.content.addToEnd(content));
              //   } else {
              //     // If we can't append the content, we add it to the list of content that can't be appended.
              //     console.log("content has no children");
              //     cantAppend.push(content);
              //   }
              // });
              // console.log("td", td.toString());
              // console.log("cantAppend", Fragment.from(cantAppend).toString());
              // console.log("firstNode has content");
              // console.log("");

              // // If we want to still preserve the content that can't be appended, we can do so by adding it to the table cell.
              // return td.content.addToEnd(
              //   //
              //   Fragment.from(cantAppend)
              // );
            },
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
            getContent: (node, schema) => {
              mergeParagraphs(node as HTMLElement);

              const parser = DOMParser.fromSchema(schema);

              const parentNode = parser.parse(
                (node as HTMLElement).querySelector("p") || node,
                {
                  topNode: schema.nodes[this.name].create(),
                }
              );

              return parentNode.content;
            },
          },
        ];
      },
    }),
    TableRow,
  ]
);
