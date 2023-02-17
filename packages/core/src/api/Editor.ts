import { Editor as TiptapEditor } from "@tiptap/core";
import { DOMParser, DOMSerializer, Node, Schema } from "prosemirror-model";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import { Block, BlockSpec } from "../extensions/Blocks/api/blockTypes";
import { CursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";
import { simplifyBlocks } from "./simplifyBlocksUnifiedPlugin";

export function createBlockContent(
  blockSpec: BlockSpec
): Pick<Block, "textContent" | "styledTextContent"> {
  let textContent: string;
  let styledTextContent: StyledText[] = [];

  if (typeof blockSpec.content === "string") {
    textContent = blockSpec.content;
    styledTextContent.push({
      text: blockSpec.content,
      styles: [],
    });
  } else if (typeof blockSpec.content !== "undefined") {
    textContent = "";
    for (const styledText of blockSpec.content) {
      textContent += styledText.text;
    }
    styledTextContent = blockSpec.content;
  } else {
    textContent = "";
  }

  return {
    textContent: textContent,
    styledTextContent: styledTextContent,
  };
}

export function createBlock(blockSpec: BlockSpec, schema: Schema): Block {
  const props = schema.node(blockSpec.type, blockSpec.props).attrs;

  const { textContent, styledTextContent } = createBlockContent(blockSpec);

  return {
    id: null,
    type: blockSpec.type,
    props: props,
    textContent: textContent,
    styledTextContent: styledTextContent,
    children: blockSpec.children || [],
  } as Block;
}

export function getNodeById(
  blockId: string,
  doc: Node
): { node: Node; pos: number } {
  let targetNode: Node | undefined = undefined;
  let posBeforeNode: number | undefined = undefined;

  doc.descendants((node, pos) => {
    // Skips traversing nodes after node with target ID has been found.
    if (targetNode) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (node.type.name !== "blockContainer" || node.attrs.id !== blockId) {
      return true;
    }

    targetNode = node;
    posBeforeNode = pos;

    return false;
  });

  if (!targetNode || !posBeforeNode) {
    throw Error("Node with given ID does not exist in the document");
  }

  return {
    node: targetNode,
    pos: posBeforeNode,
  };
}

export function blockToNode(block: Block, schema: Schema) {
  const content: Node[] = [];

  for (const styledText of block.styledTextContent) {
    const marks = [];

    for (const style of styledText.styles) {
      marks.push(schema.mark(style.type, style.props));
    }

    content.push(schema.text(styledText.text, marks));
  }

  const contentNode = schema.nodes[block.type].create(block.props, content);

  const children: Node[] = [];

  if (block.children) {
    for (const child of block.children) {
      children.push(blockToNode(child, schema));
    }
  }

  const groupNode = schema.nodes["blockGroup"].create({}, children);

  return schema.nodes["blockContainer"].create(
    {},
    children.length > 0 ? [contentNode, groupNode] : contentNode
  );
}

export function nodeToBlock(node: Node): Block {
  const blockInfo = getBlockInfoFromPos(node, 0)!;

  const styledText: StyledText[] = [];
  blockInfo.contentNode.content.forEach((node) => {
    const styles: Style[] = [];

    for (const mark of node.marks) {
      styles.push({
        type: mark.type.name,
        props: mark.attrs,
      } as Style);
    }

    styledText.push({
      text: node.textContent,
      styles: styles,
    });
  });

  const children: Block[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(nodeToBlock(blockInfo.node.lastChild!.child(i)));
  }

  return {
    id: blockInfo.id,
    type: blockInfo.contentType.name,
    // TODO: Only return attributes specified in the BlockSpec, not all attributes (e.g. ordered list item index should
    //  not be included).
    props: blockInfo.contentNode.attrs,
    textContent: blockInfo.contentNode.textContent,
    styledTextContent: styledText,
    children: children,
  } as Block;
}

export class Editor {
  private blockCache = new WeakMap<Node, Block>();

  constructor(private tiptapEditor: TiptapEditor) {}

  public createBlock(blockSpec: BlockSpec): Block {
    return createBlock(blockSpec, this.tiptapEditor.schema);
  }

  private blockToNode(block: Block) {
    return blockToNode(block, this.tiptapEditor.schema);
  }

  private nodeToBlock(node: Node): Block {
    const cachedBlock = this.blockCache.get(node);

    if (cachedBlock) {
      return cachedBlock;
    }

    const block = nodeToBlock(node);
    this.blockCache.set(node, block);

    return block;
  }

  public get allBlocks(): Block[] {
    const blocks: Block[] = [];

    this.tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(this.nodeToBlock(node));

      return false;
    });

    return blocks;
  }

  public get cursorPosition(): CursorPosition {
    const { node } = getBlockInfoFromPos(
      this.tiptapEditor.state.doc,
      this.tiptapEditor.state.selection.from
    )!;

    return { block: this.nodeToBlock(node) };
  }

  public insertBlocks(
    blocksToInsert: Block[],
    referenceBlockId: string,
    placement: "before" | "after" | "nested" = "before"
  ): void {
    const nodesToInsert: Node[] = [];
    for (const block of blocksToInsert) {
      nodesToInsert.push(this.blockToNode(block));
    }

    let insertionPos = -1;

    const { node, pos } = getNodeById(
      referenceBlockId,
      this.tiptapEditor.state.doc
    );

    if (placement === "before") {
      insertionPos = pos;
    }

    if (placement === "after") {
      insertionPos = pos + node.nodeSize;
    }

    if (placement === "nested") {
      // Case if block doesn't already have children.
      if (node.childCount < 2) {
        insertionPos = pos + node.firstChild!.nodeSize + 1;

        const blockGroupNode = this.tiptapEditor.state.schema.nodes[
          "blockGroup"
        ].create({}, nodesToInsert);

        this.tiptapEditor.view.dispatch(
          this.tiptapEditor.state.tr.insert(insertionPos, blockGroupNode)
        );

        return;
      }

      insertionPos = pos + node.firstChild!.nodeSize + 2;
    }

    this.tiptapEditor.view.dispatch(
      this.tiptapEditor.state.tr.insert(insertionPos, nodesToInsert)
    );
  }

  public async blocksToHTML(blocks: Block[]): Promise<string> {
    const htmlParentElement = document.createElement("div");
    const serializer = DOMSerializer.fromSchema(this.tiptapEditor.schema);

    for (const block of blocks) {
      const node = this.blockToNode(block);
      const htmlNode = serializer.serializeNode(node);
      htmlParentElement.appendChild(htmlNode);
    }

    const htmlString = await unified()
      .use(rehypeParse, { fragment: true })
      .use(simplifyBlocks, {
        orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
        unorderedListItemBlockTypes: new Set<string>(["bulletListItem"]),
      })
      .use(rehypeStringify)
      .process(htmlParentElement.innerHTML);

    return htmlString.value as string;
  }

  public async HTMLToBlocks(htmlString: string): Promise<Block[]> {
    const htmlNode = document.createElement("div");
    htmlNode.innerHTML = htmlString.trim();

    const parser = DOMParser.fromSchema(this.tiptapEditor.schema);
    const parentNode = parser.parse(htmlNode);

    const blocks: Block[] = [];

    for (let i = 0; i < parentNode.firstChild!.childCount; i++) {
      blocks.push(this.nodeToBlock(parentNode.firstChild!.child(i)));
    }

    return blocks;
  }

  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    const markdownString = await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemark)
      .use(remarkStringify)
      .process(await this.blocksToHTML(blocks));

    return markdownString.value as string;
  }

  public async markdownToBlocks(markdownString: string): Promise<Block[]> {
    const htmlString = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(markdownString);

    return this.HTMLToBlocks(htmlString.value as string);
  }
}
