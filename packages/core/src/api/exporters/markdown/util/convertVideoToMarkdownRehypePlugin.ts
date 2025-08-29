import { visit } from "unist-util-visit";

// Originally, rehypeParse parses videos as links, which is incorrect.
export function convertVideoToMarkdown() {
  return (tree: any) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "video") {
        const src = node.properties?.src || node.properties?.["data-url"] || "";
        const name =
          node.properties?.title || node.properties?.["data-name"] || "";
        parent.children[index!] = {
          type: "text",
          value: `![${name}](${src})`,
        };
      }
    });
  };
}
