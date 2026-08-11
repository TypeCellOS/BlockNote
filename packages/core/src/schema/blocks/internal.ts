import { Attribute, Attributes, Node } from "@tiptap/core";
import type { Node as PMNode } from "prosemirror-model";
import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import { defaultBlockToHTML } from "../../blocks/defaultBlockHelpers.js";
import type { ExtensionFactoryInstance } from "../../editor/BlockNoteExtension.js";
import { mergeCSSClasses } from "../../util/browser.js";
import { camelToDataKebab } from "../../util/string.js";
import { PropSchema, Props } from "../propTypes.js";
import { LooseBlockSpec } from "./types.js";

// Function that uses the 'propSchema' of a blockConfig to create a TipTap
// node's `addAttributes` property.
// TODO: extract function
export function propsToAttributes(propSchema: PropSchema): Attributes {
  const tiptapAttributes: Record<string, Attribute> = {};

  Object.entries(propSchema).forEach(([name, spec]) => {
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

        if (
          (spec.default === undefined && spec.type === "boolean") ||
          (spec.default !== undefined && typeof spec.default === "boolean")
        ) {
          if (value === "true") {
            return true;
          }

          if (value === "false") {
            return false;
          }

          return null;
        }

        if (
          (spec.default === undefined && spec.type === "number") ||
          (spec.default !== undefined && typeof spec.default === "number")
        ) {
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
      renderHTML: (attributes) => {
        // don't render to html if the value is the same as the default
        return attributes[name] !== spec.default
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
export function getBlockFromPos(getPos: () => number | undefined, doc: PMNode) {
  // TODO is there a cleaner implementation of this? Probably...
  const pos = getPos();
  // Gets position of the node
  if (pos === undefined) {
    throw new Error("Cannot find node position");
  }

  // Gets parent blockContainer node
  const blockContainer = doc.resolve(pos).node();
  if (!blockContainer) {
    throw new Error("Cannot find block container");
  }
  const block = nodeToBlock(blockContainer, doc);
  return block;
}

/**
 * Resolves the block a node view should render, tolerating a `getPos()` that
 * can't be trusted.
 *
 * ProseMirror derives `getPos()` from its view-desc tree, but
 * `EditorView.updateStateInner` assigns the new state *before* it reconciles
 * that tree. Anything that runs partway through reconciliation - a re-entrant
 * dispatch from a node view's effect, TipTap's `flushSync` while mounting a
 * node view - therefore sees positions that no longer line up with
 * `view.state.doc`. The position then either lands out of range or, just as
 * bad, in range but pointing at the wrong node.
 *
 * Node views are constructed inside that same window, so this applies at
 * construction just as much as on re-render. The state is always transient:
 * ProseMirror finishes reconciling and rebuilds the node view against the
 * current document immediately after. So we degrade instead of throwing,
 * because a stale frame is invisible where a throw is not.
 *
 * See issues #2937, #2682 and #2621.
 */
export function getBlockFromNodeView(
  getPos: () => number | undefined,
  node: PMNode,
  doc: PMNode,
) {
  try {
    return getBlockFromPos(getPos, doc);
  } catch (e) {
    // Failing here means the node is not in `doc` — a re-entrant dispatch
    // superseded the document ProseMirror is building node views for, and the
    // node went with it. So there is no container to read an id from, and the
    // block has to be built from the node alone. Deliberately silent: this is
    // expected and self-correcting, and there is nothing a consumer could do
    // about it in the meantime.
    //
    // `type`, `props` and `content` are read off the node and are correct.
    // `children` is empty and `id` is freshly generated, i.e. it belongs to no
    // block in the document — callers must not treat it as addressable. (It
    // can't collide with a real block: ids are uuids, and the deterministic
    // test-mode generator shares one monotonic counter with real ids.) This is
    // short-lived; ProseMirror rebuilds the node view against the real document
    // right after.
    //
    // The alternatives are worse. Throwing is the crash this exists to prevent.
    // Returning an empty placeholder node view can leave the block
    // *permanently* blank, since vanilla node views don't implement `update()`
    // and so are only rebuilt when something else changes the document.
    //
    // `createAndFill` rather than `create` so an unexpected node shape yields
    // `null` instead of throwing over the top of the original failure.
    const standalone = doc.type.schema.nodes["blockContainer"]?.createAndFill(
      null,
      node,
    );
    if (standalone) {
      return nodeToBlock(standalone, doc);
    }

    // Nothing left to render from. Surface the original failure rather than
    // inventing a block that isn't grounded in anything.
    throw e;
  }
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
    const spec = propSchema[prop];
    if (value !== spec?.default) {
      blockContent.setAttribute(camelToDataKebab(prop), value);
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
    content: "inline" | "table" | "none" | "plain";
  },
  P extends PropSchema,
>(
  config: T,
  propSchema: P,
  extensions?: ExtensionFactoryInstance[],
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
