import { Attribute, Attributes, Editor, Node, NodeConfig } from "@tiptap/core";
import { ParseRule } from "prosemirror-model";
import { BlockNoteEditor } from "../../../../BlockNoteEditor";
import { mergeCSSClasses } from "../../../../shared/utils";
import { defaultBlockToHTML } from "../../nodes/BlockContent/defaultBlockHelpers";
import { inheritedProps } from "../defaultProps";
import { InlineContentSchema } from "../inlineContent/types";
import { StyleSchema } from "../styles/types";
import {
  BlockConfig,
  BlockNoteDOMAttributes,
  BlockSchemaFromSpecs,
  BlockSchemaWithBlock,
  BlockSpec,
  BlockSpecs,
  Props,
  PropSchema,
  SpecificBlock,
  TiptapBlockImplementation,
} from "./types";

export function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
// TODO: extract function
export function propsToAttributes(propSchema: PropSchema): Attributes {
  const tiptapAttributes: Record<string, Attribute> = {};

  Object.entries(propSchema)
    .filter(([name, _spec]) => !inheritedProps.includes(name))
    .forEach(([name, spec]) => {
      tiptapAttributes[name] = {
        default: spec.default,
        keepOnSplit: true,
        // Props are displayed in kebab-case as HTML attributes. If a prop's
        // value is the same as its default, we don't display an HTML
        // attribute for it.
        parseHTML: (element) => {
          const value = element.getAttribute(camelToDataKebab(name));

          if (value === null) {
            return null;
          }

          if (typeof spec.default === "boolean") {
            if (value === "true") {
              return true;
            }

            if (value === "false") {
              return false;
            }

            return null;
          }

          if (typeof spec.default === "number") {
            const asNumber = parseFloat(value);
            const isNumeric =
              !Number.isNaN(asNumber) && Number.isFinite(asNumber);

            if (isNumeric) {
              return asNumber;
            }

            return null;
          }

          return value;
        },
        renderHTML: (attributes) =>
          attributes[name] !== spec.default
            ? {
                [camelToDataKebab(name)]: attributes[name],
              }
            : {},
      };
    });

  return tiptapAttributes;
}

// Function that uses the 'parse' function of a blockConfig to create a
// TipTap node's `parseHTML` property. This is only used for parsing content
// from the clipboard.
export function parse(blockConfig: BlockConfig) {
  const rules: ParseRule[] = [
    {
      tag: `.bn-block-content[data-block-content-type="${blockConfig.type}"]`,
      contentElement: `.bn-block-editable`,
    },
  ];

  // if (blockConfig.parse) {
  //   rules.push({
  //     tag: "*",
  //     getAttrs(node: string | HTMLElement) {
  //       if (typeof node === "string") {
  //         return false;
  //       }
  //
  //       const block = blockConfig.parse?.(node);
  //
  //       if (block === undefined) {
  //         return false;
  //       }
  //
  //       return block.props || {};
  //     },
  //     getContent(node, schema) {
  //       const block = blockConfig.parse?.(node as HTMLElement);
  //
  //       if (block !== undefined && block.content !== undefined) {
  //         return Fragment.from(
  //           typeof block.content === "string"
  //             ? schema.text(block.content)
  //             : inlineContentToNodes(block.content, schema)
  //         );
  //       }
  //
  //       return Fragment.empty;
  //     },
  //   });
  // }

  return rules;
}

// Used to figure out which block should be rendered. This block is then used to
// create the node view.
export function getBlockFromPos<
  BType extends string,
  Config extends BlockConfig,
  BSchema extends BlockSchemaWithBlock<BType, Config>,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  getPos: (() => number) | boolean,
  editor: BlockNoteEditor<BSchema, I, S>,
  tipTapEditor: Editor,
  type: BType
) {
  // Gets position of the node
  if (typeof getPos === "boolean") {
    throw new Error(
      "Cannot find node position as getPos is a boolean, not a function."
    );
  }
  const pos = getPos();
  // Gets parent blockContainer node
  const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
  // Gets block identifier
  const blockIdentifier = blockContainer.attrs.id;
  // Gets the block
  const block = editor.getBlock(blockIdentifier)! as SpecificBlock<
    BSchema,
    BType,
    I,
    S
  >;
  if (block.type !== type) {
    throw new Error("Block type does not match");
  }

  return block;
}

// Function that wraps the `dom` element returned from 'blockConfig.render' in a
// `blockContent` div, which contains the block type and props as HTML
// attributes. If `blockConfig.render` also returns a `contentDOM`, it also adds
// an `inlineContent` class to it.
export function addBlockContentAttributes<
  BType extends string,
  PSchema extends PropSchema
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  },
  blockType: BType,
  blockProps: Props<PSchema>,
  propSchema: PSchema,
  domAttributes?: BlockNoteDOMAttributes
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  destroy?: () => void;
} {
  // Adds block content & custom classes
  element.dom.className = mergeCSSClasses(
    "bn-block-content",
    element.dom.className,
    domAttributes?.blockContent?.class || ""
  );
  // Sets content type attribute
  element.dom.setAttribute("data-block-content-type", blockType);
  // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
  // props which are already added as HTML attributes to the parent
  // `blockContent` element (inheritedProps) and props set to their default
  // values.
  Object.entries(blockProps)
    .filter(
      ([prop, value]) =>
        !inheritedProps.includes(prop) && value !== propSchema[prop].default
    )
    .map(([prop, value]) => {
      return [camelToDataKebab(prop), value];
    })
    .forEach(([prop, value]) => element.dom.setAttribute(prop, value));
  // Adds custom HTML attributes
  Object.entries(domAttributes?.blockContent || {})
    .filter(([key]) => key !== "class")
    .forEach(([attr, value]) => element.dom.setAttribute(attr, value));

  // Checks if the block contains an editable field
  if (element.contentDOM !== undefined) {
    // Adds block editable & custom classes
    element.contentDOM.className = mergeCSSClasses(
      "bn-block-editable",
      element.contentDOM.className,
      domAttributes?.blockEditable?.class || ""
    );

    // Adds custom HTML attributes
    Object.entries(domAttributes?.blockEditable || {})
      .filter(([key]) => key !== "class")
      .forEach(([attr, value]) =>
        element.contentDOM!.setAttribute(attr, value)
      );
  }

  return element;
}

// Helper type to keep track of the `name` and `content` properties after calling Node.create.
type StronglyTypedTipTapNode<
  Name extends string,
  Content extends "inline*" | "tableRow+" | ""
> = Node & { name: Name; config: { content: Content } };

export function createStronglyTypedTiptapNode<
  Name extends string,
  Content extends "inline*" | "tableRow+" | ""
>(
  config: NodeConfig<{
    editor: BlockNoteEditor<any, any, any>;
    domAttributes: BlockNoteDOMAttributes;
  }> & { name: Name; content: Content }
) {
  return Node.create<{
    editor: BlockNoteEditor<any, any, any>;
    domAttributes: BlockNoteDOMAttributes;
  }>(config) as StronglyTypedTipTapNode<Name, Content>; // force re-typing (should be safe as it's type-checked from the config)
}

// This helper function helps to instantiate a blockspec with a
// config and implementation that conform to the type of Config
export function createInternalBlockSpec<T extends BlockConfig>(
  config: T,
  implementation: TiptapBlockImplementation<
    T,
    any,
    InlineContentSchema,
    StyleSchema
  >
) {
  return {
    config,
    implementation,
  } satisfies BlockSpec<T, any, InlineContentSchema, StyleSchema>;
}

export function createBlockSpecFromStronglyTypedTiptapNode<
  T extends Node,
  P extends PropSchema
>(node: T, propSchema: P, requiredNodes?: Node[]) {
  return createInternalBlockSpec(
    {
      type: node.name as T["name"],
      content: (node.config.content === "inline*"
        ? "inline"
        : node.config.content === "tableRow+"
        ? "table"
        : "none") as T["config"]["content"] extends "inline*"
        ? "inline"
        : T["config"]["content"] extends "tableRow+"
        ? "table"
        : "none",
      propSchema,
    },
    {
      node,
      requiredNodes,
      toInternalHTML: defaultBlockToHTML,
      toExternalHTML: defaultBlockToHTML,
    }
  );
}

export function getBlockSchemaFromSpecs<T extends BlockSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as BlockSchemaFromSpecs<T>;
}
