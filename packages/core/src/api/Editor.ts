import { Editor as TiptapEditor } from "@tiptap/core";
import { DOMParser, DOMSerializer, Node } from "prosemirror-model";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import { Element as HASTElement, Parent as HASTParent } from "hast";
import { fromDom } from "hast-util-from-dom";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import { Block, BlockSpec } from "../extensions/Blocks/api/blockTypes";
import { CursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";

export class Editor {
  private blockCache = new WeakMap<Node, Block>();

  constructor(private tiptapEditor: TiptapEditor) {}

  public createBlock(blockSpec: BlockSpec): Block {
    const props = this.tiptapEditor.schema.node(
      blockSpec.type,
      blockSpec.props
    ).attrs;

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
      id: null,
      type: blockSpec.type,
      props: props,
      textContent: textContent,
      styledTextContent: styledTextContent,
      children: blockSpec.children || [],
    } as Block;
  }

  private blockToNode(block: Block) {
    const content: Node[] = [];

    for (const styledText of block.styledTextContent) {
      const marks = [];

      for (const style of styledText.styles) {
        marks.push(this.tiptapEditor.schema.mark(style.type, style.props));
      }

      content.push(this.tiptapEditor.schema.text(styledText.text, marks));
    }

    const contentNode = this.tiptapEditor.state.schema.nodes[block.type].create(
      block.props,
      content
    );

    const children: Node[] = [];

    if (block.children) {
      for (const child of block.children) {
        children.push(this.blockToNode(child));
      }
    }

    const groupNode = this.tiptapEditor.state.schema.nodes["blockGroup"].create(
      {},
      children
    );

    return this.tiptapEditor.state.schema.nodes["blockContainer"].create(
      {},
      children.length > 0 ? [contentNode, groupNode] : contentNode
    );
  }

  private nodeToBlock(node: Node): Block {
    const cachedBlock = this.blockCache.get(node);
    if (cachedBlock) {
      return cachedBlock;
    }

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
      children.push(this.nodeToBlock(blockInfo.node.lastChild!.child(i)));
    }

    const block = {
      id: blockInfo.id,
      type: blockInfo.contentType.name,
      // TODO: Only return attributes specified in the BlockSpec, not all attributes (e.g. ordered list item index should
      //  not be included).
      props: blockInfo.contentNode.attrs,
      textContent: blockInfo.contentNode.textContent,
      styledTextContent: styledText,
      children: children,
    } as Block;

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
    placement?: "before" | "after" | "nested"
  ): void {
    if (!placement) {
      placement = "before";
    }

    let blockFound = false;

    this.tiptapEditor.state.doc.descendants((node, pos) => {
      if (blockFound) {
        return false;
      }

      if (
        node.type.name !== "blockContainer" ||
        node.attrs.id !== referenceBlockId
      ) {
        return true;
      }

      blockFound = true;

      const nodesToInsert = [];
      for (const block of blocksToInsert) {
        nodesToInsert.push(this.blockToNode(block));
      }

      let insertionPos = -1;

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

          return false;
        }

        insertionPos = pos + node.firstChild!.nodeSize + 2;
      }

      this.tiptapEditor.view.dispatch(
        this.tiptapEditor.state.tr.insert(insertionPos, nodesToInsert)
      );

      return false;
    });

    if (!blockFound) {
      throw Error("Block with given ID does not exist in the document");
    }
  }

  public async blocksToHTML(blocks: Block[]): Promise<string> {
    type SimplifyBlocksOptions = {
      orderedListItemBlockTypes: Set<string>;
      unorderedListItemBlockTypes: Set<string>;
    };

    /**
     * Rehype plugin which converts the HTML output rendered by BlockNote into a simplified structure which better
     * follows HTML standards. It does several things:
     * - Removes all block related div elements, leaving only the actual content inside the block.
     * - Lifts nested blocks to a higher level for all block types that don't represent list items.
     * - Wraps blocks which represent list items in corresponding ul/ol HTML elements and restructures them to comply
     * with HTML list structure.
     * @param options Options for specifying which block types represent ordered and unordered list items.
     */
    function simplifyBlocks(options: SimplifyBlocksOptions) {
      const listItemBlockTypes = new Set<string>([
        ...options.orderedListItemBlockTypes,
        ...options.unorderedListItemBlockTypes,
      ]);

      const simplifyBlocksHelper = (tree: HASTParent) => {
        let numChildElements = tree.children.length;
        let activeList: HASTElement | undefined;

        for (let i = 0; i < numChildElements; i++) {
          const blockOuter = tree.children[i] as HASTElement;
          const blockContainer = blockOuter.children[0] as HASTElement;
          const blockContent = blockContainer.children[0] as HASTElement;
          const blockGroup =
            blockContainer.children.length === 2
              ? (blockContainer.children[1] as HASTElement)
              : null;

          const isListItemBlock = listItemBlockTypes.has(
            blockContent.properties!["dataContentType"] as string
          );

          const listItemBlockType = isListItemBlock
            ? options.orderedListItemBlockTypes.has(
                blockContent.properties!["dataContentType"] as string
              )
              ? "ol"
              : "ul"
            : null;

          // Plugin runs recursively to process nested blocks.
          if (blockGroup !== null) {
            simplifyBlocksHelper(blockGroup);
          }

          // Checks that there is an active list, but the block can't be added to it as it's of a different type.
          if (activeList && activeList.tagName !== listItemBlockType) {
            // Blocks that were copied into the list are removed and the list is inserted in their place.
            tree.children.splice(
              i - activeList.children.length,
              activeList.children.length,
              activeList
            );

            // Updates the current index and number of child elements.
            const numElementsRemoved = activeList.children.length - 1;
            i -= numElementsRemoved;
            numChildElements -= numElementsRemoved;

            activeList = undefined;
          }

          // Checks if the block represents a list item.
          if (isListItemBlock) {
            // Checks if a list isn't already active. We don't have to check if the block and the list are of the same
            // type as this was already done earlier.
            if (!activeList) {
              // Creates a new list element to represent an active list.
              activeList = fromDom(
                document.createElement(listItemBlockType!)
              ) as HASTElement;
            }

            // Creates a new list item element to represent the block.
            const listItemElement = fromDom(
              document.createElement("li")
            ) as HASTElement;

            // Adds only the content inside the block to the active list.
            listItemElement.children.push(blockContent.children[0]);
            // Nested blocks have already been processed in the recursive function call, so the resulting elements are
            // also added to the active list.
            if (blockGroup !== null) {
              listItemElement.children.push(...blockGroup.children);
            }

            // Adds the list item representing the block to the active list.
            activeList.children.push(listItemElement);
          } else if (blockGroup !== null) {
            // Lifts all children out of the current block, as only list items should allow nesting.
            tree.children.splice(i + 1, 0, ...blockGroup.children);
            // Replaces the block with only the content inside it.
            tree.children[i] = blockContent.children[0];

            // Updates the current index and number of child elements.
            const numElementsAdded = blockGroup.children.length;
            i += numElementsAdded;
            numChildElements += numElementsAdded;
          } else {
            // Replaces the block with only the content inside it.
            tree.children[i] = blockContent.children[0];
          }
        }

        // Since the active list is only inserted after encountering a block which can't be added to it, there are cases
        // where it remains un-inserted after processing all blocks, which are handled here.
        if (activeList) {
          tree.children.splice(
            numChildElements - activeList.children.length,
            activeList.children.length,
            activeList
          );
        }
      };

      return simplifyBlocksHelper;
    }

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

  // public get selection

  // public onSelectionChange
}
