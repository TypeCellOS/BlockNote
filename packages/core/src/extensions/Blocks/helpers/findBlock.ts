import { findParentNode } from "@tiptap/core";

export const findBlock = findParentNode(
  (node) => node.type.name === "blockContainer"
);
