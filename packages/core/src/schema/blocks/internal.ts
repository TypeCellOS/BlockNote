import { Attribute, Attributes, Editor, Node } from "@tiptap/core";
import * as z from "zod/v4/core";
import { defaultBlockToHTML } from "../../blocks/defaultBlockHelpers.js";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { mergeCSSClasses } from "../../util/browser.js";
import { camelToDataKebab } from "../../util/string.js";
import { InlineContentSchema } from "../inlineContent/types.js";
import { PropSchema, Props } from "../propTypes.js";
import { StyleSchema } from "../styles/types.js";
import {
  BlockConfig,
  BlockSchemaWithBlock,
  LooseBlockSpec,
  SpecificBlock,
} from "./types.js";

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
// TODO: extract function
export function propsToAttributes(propSchema: PropSchema): Attributes {
  const tiptapAttributes: Record<string, Attribute> = {};

  Object.entries(propSchema._zod.def.shape).forEach(([name, spec]) => {
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
  getPos: () => number | undefined,
  editor: BlockNoteEditor<BSchema, I, S>,
  tipTapEditor: Editor,
  type: BType,
) {
  const pos = getPos();
  // Gets position of the node
  if (pos === undefined) {
    throw new Error("Cannot find node position");
  }
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
  PSchema extends PropSchema,
>(
  element: {
    dom: HTMLElement | DocumentFragment;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  },
  blockType: BType,
  blockProps: Partial<Props<PSchema>>,
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
    if (value !== defaultValue) {
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

  if (element.contentDOM) {
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

export function createBlockSpecFromTiptapNode<
  const T extends {
    node: Node;
    type: string;
    content: "inline" | "table" | "none";
  },
  P extends PropSchema,
>(
  config: T,
  propSchema: P,
  extensions?: BlockNoteExtension<any>[],
): LooseBlockSpec<T["type"], P, T["content"]> {
  return {
    config: {
      type: config.type as T["type"],
      content: config.content,
      propSchema,
    },
    implementation: {
      node: config.node,
      render: defaultBlockToHTML,
      toExternalHTML: defaultBlockToHTML,
    },
    extensions,
  };
}
