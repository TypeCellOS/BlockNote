import { NodeExtension, NodeExtensionSpec } from "@remirror/core";
import { ApplySchemaAttributes } from "remirror";

export class BlockGroupExtension extends NodeExtension {
  get name() {
    return "blockGroup" as const;
  }

  // createTags() {
  //   return ["blockGroup"];
  // }

  createNodeSpec(
    extra: ApplySchemaAttributes,
    options: any
  ): NodeExtensionSpec {
    return {
      content: "blockContainer+",
      group: "blockGroup",
      attrs: {
        ...extra.defaults(),
      },
      parseDOM: [
        {
          tag: "div",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }

            if (element.getAttribute("data-node-type") === "blockGroup") {
              // Null means the element matches, but we don't want to add any attributes to the node.
              return null;
            }

            return false;
          },
        },
      ],
      toDOM: () => [
        "div",
        { class: "blockGroup", "data-node-type": "blockGroup" },
        0,
      ],
    };
  }
}
