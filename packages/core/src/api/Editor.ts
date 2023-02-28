import { Editor as TiptapEditor } from "@tiptap/core";
import {
  DOMParser,
  DOMSerializer,
  Node as PMNode,
  Node,
  Schema,
} from "prosemirror-model";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import {
  Block,
  BlockProps,
  blockProps,
  PartialBlock,
} from "../extensions/Blocks/api/blockTypes";
import { TextCursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";
import { simplifyBlocks } from "./simplifyBlocksRehypePlugin";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";

export function blockToNode(block: PartialBlock, schema: Schema) {
  let content: PMNode[] = [];

  if (typeof block.content === "string") {
    content.push(schema.text(block.content));
  } else if (typeof block.content === "object") {
    for (const styledText of block.content) {
      const marks = [];

      for (const style of styledText.styles) {
        marks.push(schema.mark(style.type, style.props));
      }

      content.push(schema.text(styledText.text, marks));
    }
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

export function getNodeById(
  id: string,
  doc: Node
): { node: Node; posBeforeNode: number } {
  let targetNode: Node | undefined = undefined;
  let posBeforeNode: number | undefined = undefined;

  doc.descendants((node, pos) => {
    // Skips traversing nodes after node with target ID has been found.
    if (targetNode) {
      return false;
    }

    // Keeps traversing nodes if block with target ID has not been found.
    if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
      return true;
    }

    targetNode = node;
    posBeforeNode = pos;

    return false;
  });

  if (!targetNode || !posBeforeNode) {
    throw Error("Could not find block in the editor with matching ID.");
  }

  return {
    node: targetNode,
    posBeforeNode: posBeforeNode,
  };
}

export function nodeToBlock(node: Node): Block {
  const blockInfo = getBlockInfoFromPos(node, 0)!;

  const props: any = {};
  for (const [attr, value] of Object.entries(blockInfo.contentNode.attrs)) {
    if (!(blockInfo.contentType.name in blockProps)) {
      throw Error(
        "Block is of an unrecognized type: " + blockInfo.contentType.name
      );
    }

    const validAttrs = blockProps[blockInfo.contentType.name as Block["type"]];

    if (validAttrs.has(attr as BlockProps)) {
      props[attr] = value;
    }
  }

  const content: StyledText[] = [];
  blockInfo.contentNode.content.forEach((node) => {
    const styles: Style[] = [];

    for (const mark of node.marks) {
      styles.push({
        type: mark.type.name,
        props: mark.attrs,
      } as Style);
    }

    content.push({
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
    props: props,
    content: content,
    children: children,
  } as Block;
}

export class Editor {
  private blockCache = new WeakMap<Node, Block>();

  constructor(private tiptapEditor: TiptapEditor) {}

  /**
   * Converts a Block into a ProseMirror node.
   * @param block The Block to convert into a ProseMirror node.
   */
  private blockToNode(block: PartialBlock) {
    return blockToNode(block, this.tiptapEditor.schema);
  }

  /**
   * Gets the ProseMirror `blockContainer` node with the given ID from within a document. Throws an error if no
   * `blockContainerNode` with the given ID could be found.
   * @param id The ID of the target `blockContainer` node.
   * @param doc The ProseMirror document to search for the node in.
   */
  private getNodeById(
    id: string,
    doc: Node
  ): { node: Node; posBeforeNode: number } {
    return getNodeById(id, doc);
  }

  /**
   * Converts a ProseMirror node into a Block.
   * @param node The ProseMirror node to convert into a Block.
   */
  private nodeToBlock(node: Node): Block {
    const cachedBlock = this.blockCache.get(node);

    if (cachedBlock) {
      return cachedBlock;
    }

    const block = nodeToBlock(node);
    this.blockCache.set(node, block);

    return block;
  }

  /**
   * Gets a list of all top-level blocks that are in the editor.
   */
  public get allBlocks(): Block[] {
    const blocks: Block[] = [];

    this.tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(this.nodeToBlock(node));

      return false;
    });

    return blocks;
  }

  /**
   * Gets information regarding the position of the text cursor in the editor.
   */
  public get textCursorPosition(): TextCursorPosition {
    const { node } = getBlockInfoFromPos(
      this.tiptapEditor.state.doc,
      this.tiptapEditor.state.selection.from
    )!;

    return { block: this.nodeToBlock(node) };
  }

  /**
   * Inserts multiple blocks before, after, or nested inside an existing block in the editor.
   * @param blocksToInsert An array of specifications for the blocks to insert.
   * @param blockToInsertAt An existing block, marking where the new blocks should be inserted at.
   * @param placement Determines whether the blocks should be inserted just before, just after, or nested inside the
   * existing block.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock[],
    blockToInsertAt: Block,
    placement: "before" | "after" | "nested" = "before"
  ): void {
    if (blockToInsertAt.id === null) {
      throw Error(
        "The target block has a null ID and could not be found in the editor: " +
          blockToInsertAt
      );
    }

    const nodesToInsert: Node[] = [];
    for (const blockSpec of blocksToInsert) {
      nodesToInsert.push(this.blockToNode(blockSpec));
    }

    let insertionPos = -1;

    const { node, posBeforeNode } = this.getNodeById(
      blockToInsertAt.id,
      this.tiptapEditor.state.doc
    );

    if (placement === "before") {
      insertionPos = posBeforeNode;
    }

    if (placement === "after") {
      insertionPos = posBeforeNode + node.nodeSize;
    }

    if (placement === "nested") {
      // Case if block doesn't already have children.
      if (node.childCount < 2) {
        insertionPos = posBeforeNode + node.firstChild!.nodeSize + 1;

        const blockGroupNode = this.tiptapEditor.state.schema.nodes[
          "blockGroup"
        ].create({}, nodesToInsert);

        this.tiptapEditor.view.dispatch(
          this.tiptapEditor.state.tr.insert(insertionPos, blockGroupNode)
        );

        return;
      }

      insertionPos = posBeforeNode + node.firstChild!.nodeSize + 2;
    }

    this.tiptapEditor.view.dispatch(
      this.tiptapEditor.state.tr.insert(insertionPos, nodesToInsert)
    );
  }

  /**
   * Updates a block in the editor to the given specification.
   * @param blockToUpdate The block that should be updated.
   * @param updatedBlock The specification that the block should be updated to.
   */
  public updateBlock(blockToUpdate: Block, updatedBlock: PartialBlock) {
    if (blockToUpdate.id === null) {
      throw Error(
        "The target block has a null ID and could not be found in the editor: " +
          blockToUpdate
      );
    }

    const { posBeforeNode } = this.getNodeById(
      blockToUpdate.id,
      this.tiptapEditor.state.doc
    );

    this.tiptapEditor.commands.BNUpdateBlock(posBeforeNode + 1, updatedBlock);
  }

  /**
   * Removes multiple blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: Block[]) {
    const idsOfBlocksToRemove = new Set<string>(
      blocksToRemove.map((block) => {
        if (block.id === null) {
          throw Error(
            "The following block has a null ID and could not be found in the editor: " +
              block
          );
        }

        return block.id;
      })
    );

    let removedSize = 0;

    this.tiptapEditor.state.doc.descendants((node, pos) => {
      // Skips traversing nodes after all target blocks have been removed.
      if (idsOfBlocksToRemove.size === 0) {
        return false;
      }

      // Keeps traversing nodes if block with target ID has not been found.
      if (
        node.type.name !== "blockContainer" ||
        !idsOfBlocksToRemove.has(node.attrs.id)
      ) {
        return true;
      }

      idsOfBlocksToRemove.delete(node.attrs.id);
      const oldDocSize = this.tiptapEditor.state.doc.nodeSize;

      this.tiptapEditor.commands.BNDeleteBlock(pos - removedSize + 1);

      const newDocSize = this.tiptapEditor.state.doc.nodeSize;
      removedSize += oldDocSize - newDocSize;

      return false;
    });

    if (idsOfBlocksToRemove.size > 0) {
      let notFoundIds = "";

      for (const id of Array.from(idsOfBlocksToRemove)) {
        notFoundIds += "\n" + id;
      }

      throw Error(
        "Blocks with the following IDs could not be found in the editor: " +
          notFoundIds
      );
    }
  }

  public onUpdate(callback: () => void) {
    this.tiptapEditor.on("update", callback);
  }

  /**
   * Serializes a list of blocks into an HTML string. The output is not the same as what's rendered by the editor, and
   * is simplified in order to better conform to HTML standards. Block structuring elements are removed, children of
   * blocks which aren't list items are lifted out of them, and list items blocks are wrapped in `ul`/`ol` tags.
   * @param blocks The list of blocks to serialize into HTML.
   */
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

  /**
   * Creates a list of blocks from an HTML string.
   * @param htmlString The HTML string to create a list of blocks from.
   */
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

  /**
   * Serializes a list of blocks into a Markdown string. The output is simplified as Markdown does not support all
   * features of BlockNote. Block structuring elements are removed, children of blocks which aren't list items are
   * lifted out of them, and certain styles are removed.
   * @param blocks The list of blocks to serialize into Markdown.
   */
  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    const markdownString = await unified()
      .use(rehypeParse, { fragment: true })
      .use(removeUnderlines)
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify)
      .process(await this.blocksToHTML(blocks));

    return markdownString.value as string;
  }

  /**
   * Creates a list of blocks from a Markdown string.
   * @param markdownString The Markdown string to create a list of blocks from.
   */
  public async markdownToBlocks(markdownString: string): Promise<Block[]> {
    const htmlString = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(markdownString);

    return this.HTMLToBlocks(htmlString.value as string);
  }
}
