import { InlineContent } from "../../../extensions/Blocks/api/inlineContentTypes";
import {
  BlockSchema,
  SpecificPartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { DOMParser, Schema } from "prosemirror-model";
import { contentNodeToInlineContent } from "../../nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

const blockRegex =
  /^(address|blockquote|body|center|dir|div|dl|fieldset|form|h[1-6]|hr|isindex|menu|noframes|noscript|ol|p|pre|table|ul|dd|dt|frameset|li|tbody|td|tfoot|th|thead|tr|html)$/i;

function isBlockLevel(element: Element) {
  return blockRegex.test(element.nodeName);
}

// Current problem: Even if a parse function hits, we still need to parse
// potentially nested blocks. But some of the element's children should be
// parsed as inline content, and some should be parsed as blocks. We need to
// somehow separate what should be parsed as inline content and what should be
// parsed as blocks.
//
// We could say that we just don't parse children if a parse function hits and
// leave the responsibility getting child blocks to the parse function. But this
// causes issues with e.g. a numbered list in a bullet list, as the numbered
// list item block has to know about the bullet list block in the schema. This
// also means code for parsing the 2 list types will basically be duplicated
// across their respective blocks. And in addition to that, we still have the
// issue of making sure that elements that should be blocks are not parsed as
// inline content.
export function parseExternalHTML<BSchema extends BlockSchema>(
  html: string,
  editor: BlockNoteEditor<BSchema>
) {
  const element = document.createElement("div");
  element.innerHTML = html;
  const parseFunctions = Object.fromEntries(
    Object.entries(editor.schema).map(([blockType, blockSpec]) => [
      blockType,
      blockSpec.fromExternalHTML,
    ])
  );
  const parser = DOMParser.fromSchema(editor._tiptapEditor.schema);
  const schema = editor._tiptapEditor.schema;

  return parseExternalHTMLHelper(element, parseFunctions, parser, schema);
}

function parseExternalHTMLHelper(
  element: HTMLElement,
  parseFunctions: Record<
    string,
    (
      element: HTMLElement,
      getInlineContent: (element: HTMLElement) => InlineContent[]
    ) => SpecificPartialBlock<BlockSchema, string> | undefined
  >,
  parser: DOMParser,
  schema: Schema
): SpecificPartialBlock<BlockSchema, string>[] {
  // Function to parse an element's children as inline content. This is used by
  // the parse functions, i.e. it is the responsibility of the parse functions
  // to decide what should be parsed as inline content and what should be parsed
  // as blocks.
  function getInlineContent(element: HTMLElement) {
    const inlineChildElements: (Element | Node)[] = [];
    let numNonElementNodes = 0;
    // We need to convert both text and inline elements to inline content.
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes.item(i);

      if (node.nodeType !== Node.ELEMENT_NODE) {
        numNonElementNodes++;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        inlineChildElements.push(node);
      } else {
        const e = element.children.item(i - numNonElementNodes)!;

        if (!isBlockLevel(e)) {
          inlineChildElements.push(e);
        }
      }
    }

    const parent = document.createElement("div");
    parent.append(...inlineChildElements);

    const content: InlineContent[] = [];
    content.push(
      ...contentNodeToInlineContent(
        parser.parse(parent, {
          // TODO: While the type of node used doesn't matter much, just needs
          //  to have `content: "inline*"`, it shouldn't be hardcoded to
          //  "paragraph" either.
          topNode: schema.nodes["paragraph"].create(),
        })
      )
    );
    return content;
  }

  const block = Object.values(parseFunctions)
    .map((parseFunction) => parseFunction(element, getInlineContent))
    .find((parsed) => parsed !== undefined);

  if (block !== undefined) {
    return [block];
  }

  // Currently only parses child elements if none of the parse functions hit on
  // the element itself. This leaves the responsibility of parsing child
  // elements to the parse functions. However, this is incorrect as that means
  // that e.g. a numbered list in a bullet list will not be parsed correctly as
  // the parsed blocks are of different types.
  const blocks: SpecificPartialBlock<BlockSchema, string>[] = [];

  for (let i = 0; i < element.childElementCount; i++) {
    blocks.push(
      ...parseExternalHTMLHelper(
        element.children.item(i) as HTMLElement,
        parseFunctions,
        parser,
        schema
      )
    );
  }

  return blocks;
}
