import { blockToNode } from "../api/nodeConversions/blockToNode.js";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
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
  inlineContentHTMLAttributes: Record<string, string>,
) {
  const blockContent = document.createElement("div");
  blockContent.className = mergeCSSClasses(
    "bn-block-content",
    blockContentHTMLAttributes.class,
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
    inlineContentHTMLAttributes.class,
  );
  for (const [attribute, value] of Object.entries(
    inlineContentHTMLAttributes,
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
  S extends StyleSchema,
>(
  block: BlockNoDefaults<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>,
  external = false,
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
      "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`.",
    );
  }

  const renderSpec = toDOM(node);

  if (typeof renderSpec !== "object" || !("dom" in renderSpec)) {
    throw new Error(
      "Cannot use this block's default HTML serialization as its corresponding TipTap node's `renderHTML` function does not return an object with the `dom` property.",
    );
  }

  // When exporting to external HTML, we convert from `data-*` attributes to
  // inline styles properties which can be understood by external applications.
  //
  // Note: This is a bit hacky to do this here as we're just hardcoding this for
  // props on default blocks. We should revisit this when we migrate internal
  // blocks to use the custom blocks API.
  if (external) {
    const dom = renderSpec.dom as HTMLElement;

    if (dom.hasAttribute("data-background-color")) {
      const backgroundColor = dom.getAttribute("data-background-color")!;

      // If the background color is one of the default colors, we set the
      // color's hex code from the default theme, as this will look nicer than
      // using regular CSS colors. For example, instead of
      // `background-color: red`, we use `background-color: #fbe4e4`.
      if (backgroundColor in COLORS_DEFAULT) {
        const cssVariableName =
          `--blocknote-background-${backgroundColor}` as any;

        dom.style.setProperty(
          cssVariableName,
          COLORS_DEFAULT[backgroundColor as keyof typeof COLORS_DEFAULT]
            .background,
        );
        dom.style.backgroundColor = `var(${cssVariableName})`;
      } else {
        dom.style.backgroundColor = backgroundColor;
      }

      dom.removeAttribute("data-background-color");
    }

    if (dom.hasAttribute("data-text-color")) {
      const textColor = dom.getAttribute("data-text-color")!;

      // If the text color is one of the default colors, we set the color's hex
      // code from the default theme, as this will look nicer than using regular
      // CSS colors. For example, instead of `color: red`, we use
      // `color: #e03e3e`.
      if (textColor in COLORS_DEFAULT) {
        const cssVariableName = `--blocknote-text-${textColor}` as any;

        dom.style.setProperty(
          cssVariableName,
          COLORS_DEFAULT[textColor as keyof typeof COLORS_DEFAULT].text,
        );
        dom.style.color = `var(${cssVariableName})`;
      } else {
        dom.style.color = textColor;
      }

      dom.removeAttribute("data-text-color");
    }

    if (dom.hasAttribute("data-text-alignment")) {
      dom.style.textAlign = dom.getAttribute("data-text-alignment")!;
      dom.removeAttribute("data-text-alignment");
    }

    // We also remove the `data-level` attribute for heading blocks, as this
    // information can be inferred from whether a `h1`, `h2`, or `h3 tag is
    // used.
    if (dom.hasAttribute("data-level")) {
      dom.removeAttribute("data-level");
    }
  }

  return renderSpec as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};

// Function that merges all paragraphs into a single one separated by line breaks.
// This is used when parsing blocks like list items and table cells, as they may
// contain multiple paragraphs that ProseMirror will not be able to handle
// properly.
export function mergeParagraphs(element: HTMLElement) {
  const paragraphs = element.querySelectorAll("p");
  if (paragraphs.length > 1) {
    const firstParagraph = paragraphs[0];
    for (let i = 1; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      firstParagraph.innerHTML += "<br>" + paragraph.innerHTML;
      paragraph.remove();
    }
  }
}
