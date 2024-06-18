import { Node } from "@tiptap/core";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers";
import { defaultProps } from "../defaultProps";
import { TableExtension } from "./TableExtension";

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

const TableParagraph = Node.create({
  name: "tableParagraph",
  group: "tableContent",
  content: "inline*",

  addAttributes() {
    return {
      width: {
        default: "default",
      },
    };
  },
  parseHTML() {
    return [
      { tag: "td" },
      {
        tag: "p",
        getAttrs: (element) => {
          if (typeof element === "string" || !element.textContent) {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.tagName === "TD") {
            return {};
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const p = document.createElement("p");
    p.style.setProperty("min-width", "100px", "important");

    if (HTMLAttributes.width && HTMLAttributes.width !== "default") {
      p.style.width = HTMLAttributes.width;
    }
    return {
      dom: p,
      contentDOM: p,
    };
  },
});

const TableImage = Node.create({
  name: "tableImage",
  group: "tableContent",
  content: "inline*",

  addAttributes() {
    return {
      src: {
        default: "",
      },
      width: {
        default: "default",
      },
      backgroundColor: {
        default: "default",
      },
    };
  },
  parseHTML() {
    return [
      { tag: "td" },
      {
        tag: "img",
        getAttrs: (element) => {
          if (typeof element === "string" || !element.textContent) {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.tagName === "TD") {
            return {};
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const editor = this.options.editor;
    const img = document.createElement("img");
    img.className = "table-image";
    editor.resolveFileUrl(HTMLAttributes.src).then((downloadUrl: string) => {
      img.src = downloadUrl;
    });

    img.contentEditable = "false";
    img.draggable = false;
    img.style.backgroundColor = HTMLAttributes.backgroundColor;
    if (HTMLAttributes.width && HTMLAttributes.width !== "default") {
      img.style.width = HTMLAttributes.width;
    }

    return {
      dom: img,
    };
  },
});

export const Table = createBlockSpecFromStronglyTypedTiptapNode(
  TableBlockContent,
  tablePropSchema,
  [
    TableExtension,
    TableParagraph,
    TableImage,
    TableHeader.extend({
      content: "tableContent",
    }),
    TableCell.extend({
      content: "tableContent",
    }),
    TableRow,
  ]
);
