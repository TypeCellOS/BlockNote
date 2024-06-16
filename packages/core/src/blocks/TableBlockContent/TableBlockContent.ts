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
      caption: {
        default: "",
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
    const div = document.createElement("div");
    div.className = "table-image-container";
    const img = document.createElement("img");
    img.className = "table-image";
    img.src = HTMLAttributes.src;
    img.contentEditable = "false";
    img.draggable = false;
    div.contentEditable = "false";
    div.draggable = false;
    div.style.backgroundColor = HTMLAttributes.backgroundColor;
    if (HTMLAttributes.width && HTMLAttributes.width !== "default") {
      div.style.width = HTMLAttributes.width;
    }
    div.appendChild(img);

    if (HTMLAttributes.caption) {
      const p = document.createElement("p");
      p.innerText = HTMLAttributes.caption;
      div.appendChild(p);
    }

    return {
      dom: div,
      contentDOM: img,
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
