import {
  ApplySchemaAttributes,
  NodeExtension,
  NodeExtensionSpec,
} from "remirror";
import styles from "../../Block.module.css";

export class ParagraphBlockContentExtension extends NodeExtension {
  get name() {
    return "paragraph" as const;
  }

  createNodeSpec(extra: ApplySchemaAttributes): NodeExtensionSpec {
    return {
      content: "text*",
      group: "blockContent",
      attrs: {
        ...extra.defaults(),
      },
      toDOM: (node) => {
        return [
          "div",
          { class: styles.blockContent, "data-content-type": this.name },
          ["p", { class: styles.inlineContent }, 0],
        ];
      },
      parseDOM: [
        {
          tag: "p",
          priority: 200,
          getAttrs: (node: any) => (node.nodeName === "P" ? {} : false),
        },
      ],
    };
  }
}
