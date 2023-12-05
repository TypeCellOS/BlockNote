import {Node} from "@tiptap/core";

export const Doc = Node.create({
    name: "doc",
    topNode: true,
    content: "blockGroup",
});
