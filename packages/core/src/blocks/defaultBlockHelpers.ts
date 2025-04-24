import { blockToNode } from "../api/nodeConversions/blockToNode.js";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import type {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";

// Function that creates a ProseMirror `DOMOutputSpec` for a default block.
// Since all default blocks have the same structure (`blockContent` div with a
// `inlineContent` element inside), this function only needs the block's name
// for the `data-content-type` attribute of the `blockContent` element and the
// HTML tag of the `inlineContent` element, as well as any HTML attributes to
// add to those.
export function createDefaultBlockDOMOutputSpec(
  blockName: string,
  htmlTag: string,
  blockContentHTMLAttributes: Record<string, string>,
  inlineContentHTMLAttributes: Record<string, string>
) {
  const blockContent = document.createElement("div");
  blockContent.className = mergeCSSClasses(
    "bn-block-content",
    blockContentHTMLAttributes.class
  );
  blockContent.setAttribute("data-content-type", blockName);
  for (const [attribute, value] of Object.entries(blockContentHTMLAttributes)) {
    if (attribute !== "class") {
      blockContent.setAttribute(attribute, value);
    }
  }

  const inlineContent = document.createElement(htmlTag);
  inlineContent.className = mergeCSSClasses(
    "bn-inline-content",
    inlineContentHTMLAttributes.class
  );
  for (const [attribute, value] of Object.entries(
    inlineContentHTMLAttributes
  )) {
    if (attribute !== "class") {
      inlineContent.setAttribute(attribute, value);
    }
  }

  blockContent.appendChild(inlineContent);

  return {
    dom: blockContent,
    contentDOM: inlineContent,
  };
}

// Function used to convert default blocks to HTML. It uses the corresponding
// node's `renderHTML` method to do the conversion by using a default
// `DOMSerializer`. The `external` flag is used to modify the resulting HTML for
// external use. This just involves changing props being rendered from `data-*`
// attributes to inline styles.
export const defaultBlockToHTML = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: BlockNoDefaults<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>,
  external = false
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
} => {
  let node = blockToNode(block, editor.pmSchema);

  if (node.type.name === "blockContainer") {
    // for regular blocks, get the toDOM spec from the blockContent node
    node = node.firstChild!;
  }

  const toDOM = editor.pmSchema.nodes[node.type.name].spec.toDOM;

  if (toDOM === undefined) {
    throw new Error(
      "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`."
    );
  }

  const renderSpec = toDOM(node);

  if (typeof renderSpec !== "object" || !("dom" in renderSpec)) {
    throw new Error(
      "Cannot use this block's default HTML serialization as its corresponding TipTap node's `renderHTML` function does not return an object with the `dom` property."
    );
  }

  // TODO: This is obviously pretty hacky - will need to revisit this when we
  //  convert default blocks to use the custom block API.
  if (external) {
    const dom = renderSpec.dom as HTMLElement;

    if (dom.hasAttribute("data-background-color")) {
      dom.style.backgroundColor = dom.getAttribute("data-background-color")!;
      dom.removeAttribute("data-background-color");
    }

    if (dom.hasAttribute("data-text-color")) {
      dom.style.color = dom.getAttribute("data-text-color")!;
      dom.removeAttribute("data-text-color");
    }

    if (dom.hasAttribute("data-text-alignment")) {
      dom.style.textAlign = dom.getAttribute("data-text-alignment")!;
      dom.removeAttribute("data-text-alignment");
    }
  }

  return renderSpec as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};
