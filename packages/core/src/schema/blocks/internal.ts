import {
  Attribute,
  Attributes,
  Editor,
  Extension,
  Node,
  NodeConfig,
} from "@tiptap/core";
import * as z from "zod/v4/core";
import { defaultBlockToHTML } from "../../blocks/defaultBlockHelpers.js";
import { inheritedProps } from "../../blocks/defaultProps.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { mergeCSSClasses } from "../../util/browser.js";
import { camelToDataKebab } from "../../util/string.js";
import { InlineContentSchema } from "../inlineContent/types.js";
import { StyleSchema } from "../styles/types.js";
import {
  BlockConfig,
  BlockSchemaFromSpecs,
  BlockSchemaWithBlock,
  BlockSpec,
  BlockSpecs,
  SpecificBlock,
  TiptapBlockImplementation,
} from "./types.js";

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
// TODO: extract function0
export function propsToAttributes(propSchema: z.$ZodObject): Attributes {
  const tiptapAttributes: Record<string, Attribute> = {};

  Object.entries(propSchema._zod.def.shape)
    .filter(([name, _spec]) => !inheritedProps.includes(name))
    .forEach(([name, spec]) => {
      const def =
        spec instanceof z.$ZodDefault ? spec._zod.def.defaultValue : undefined;

      tiptapAttributes[name] = {
        default: def,
        keepOnSplit: true,
        // Props are displayed in kebab-case as HTML attributes. If a prop's
        // value is the same as its default, we don't display an HTML
        // attribute for it.
        parseHTML: (element) => {
          const value = element.getAttribute(camelToDataKebab(name));

          if (value === null) {
            return null;
          }

          // TBD: this might not be fault proof, but it's also ugly to store prop="&quot;...&quot;" for strings
          try {
            const jsonValue = JSON.parse(value);
            // it was a number / boolean / json object stored as attribute
            return z.parse(spec, jsonValue);
          } catch (e) {
            // it might have been a string directly stored as attribute
            return z.parse(spec, value);
          }
        },
        renderHTML: (attributes) => {
          // don't render to html if the value is the same as the default
          return attributes[name] !== def
            ? {
                [camelToDataKebab(name)]: attributes[name],
              }
            : {};
        },
      };
    });

  return tiptapAttributes;
}

// Used to figure out which block should be rendered. This block is then used to
// create the node view.
export function getBlockFromPos<
  BType extends string,
  Config extends BlockConfig,
  BSchema extends BlockSchemaWithBlock<BType, Config>,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  getPos: (() => number) | boolean,
  editor: BlockNoteEditor<BSchema, I, S>,
  tipTapEditor: Editor,
  type: BType,
) {
  // Gets position of the node
  if (typeof getPos === "boolean") {
    throw new Error(
      "Cannot find node position as getPos is a boolean, not a function.",
    );
  }
  const pos = getPos();
  // Gets parent blockContainer node
  const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
  // Gets block identifier
  const blockIdentifier = blockContainer.attrs.id;

  if (!blockIdentifier) {
    throw new Error("Block doesn't have id");
  }

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
export function wrapInBlockStructure<
  BType extends string,
  PSchema extends z.$ZodObject,
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  },
  blockType: BType,
  blockProps: z.output<PSchema>,
  propSchema: PSchema,
  isFileBlock = false,
  domAttributes?: Record<string, string>,
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  destroy?: () => void;
} {
  // Creates `blockContent` element
  const blockContent = document.createElement("div");

  // Adds custom HTML attributes
  if (domAttributes !== undefined) {
    for (const [attr, value] of Object.entries(domAttributes)) {
      if (attr !== "class") {
        blockContent.setAttribute(attr, value);
      }
    }
  }
  // Sets blockContent class
  blockContent.className = mergeCSSClasses(
    "bn-block-content",
    domAttributes?.class || "",
  );
  // Sets content type attribute
  blockContent.setAttribute("data-content-type", blockType);
  // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips props
  // which are already added as HTML attributes to the parent `blockContent`
  // element (inheritedProps) and props set to their default values.
  for (const [prop, value] of Object.entries(blockProps)) {
    const spec = propSchema._zod.def.shape[prop];
    const defaultValue =
      spec instanceof z.$ZodDefault ? spec._zod.def.defaultValue : undefined;
    if (!inheritedProps.includes(prop) && value !== defaultValue) {
      if (typeof value === "string") {
        blockContent.setAttribute(camelToDataKebab(prop), value);
      } else {
        blockContent.setAttribute(
          camelToDataKebab(prop),
          JSON.stringify(value),
        );
      }
    }
  }
  // Adds file block attribute
  if (isFileBlock) {
    blockContent.setAttribute("data-file-block", "");
  }

  blockContent.appendChild(element.dom);

  if (element.contentDOM !== undefined) {
    element.contentDOM.className = mergeCSSClasses(
      "bn-inline-content",
      element.contentDOM.className,
    );
  }

  return {
    ...element,
    dom: blockContent,
  };
}

// Helper type to keep track of the `name` and `content` properties after calling Node.create.
type StronglyTypedTipTapNode<
  Name extends string,
  Content extends
    | "inline*"
    | "tableRow+"
    | "blockContainer+"
    | "column column+"
    | "",
> = Node & { name: Name; config: { content: Content } };

export function createStronglyTypedTiptapNode<
  Name extends string,
  Content extends
    | "inline*"
    | "tableRow+"
    | "blockContainer+"
    | "column column+"
    | "",
>(config: NodeConfig & { name: Name; content: Content }) {
  return Node.create(config) as StronglyTypedTipTapNode<Name, Content>; // force re-typing (should be safe as it's type-checked from the config)
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
  >,
) {
  return {
    config,
    implementation,
  } satisfies BlockSpec<T, any, InlineContentSchema, StyleSchema>;
}

export function createBlockSpecFromStronglyTypedTiptapNode<
  T extends Node,
  P extends z.$ZodObject,
>(node: T, propSchema: P, requiredExtensions?: Array<Extension | Node>) {
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
      requiredExtensions,
      toInternalHTML: defaultBlockToHTML,
      toExternalHTML: defaultBlockToHTML,
      // parse: () => undefined, // parse rules are in node already
    },
  );
}

export function getBlockSchemaFromSpecs<T extends BlockSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config]),
  ) as BlockSchemaFromSpecs<T>;
}
