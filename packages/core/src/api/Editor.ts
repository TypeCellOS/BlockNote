import { Editor as TiptapEditor } from "@tiptap/core";
import { DOMParser, DOMSerializer, Node } from "prosemirror-model";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import { Block, BlockUpdate } from "../extensions/Blocks/api/blockTypes";
import { CursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkRehype from "remark-rehype";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import { Element as HASTElement, Parent as HASTParent } from "hast";
import { fromDom } from "hast-util-from-dom";

const blockCache = new WeakMap<Node, Block>();

export function styledContentFromNode(node: Node): StyledText[] {
  const styledText: StyledText[] = [];

  const blockInfo = getBlockInfoFromPos(node, 0)!;

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

  return styledText;
}

export function blockFromNode(node: Node): Block {
  const cachedBlock = blockCache.get(node);
  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoFromPos(node, 0)!;

  const children: Block[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(blockFromNode(blockInfo.node.lastChild!.child(i)));
  }

  const block = {
    id: blockInfo.id,
    type: blockInfo.contentType.name,
    // TODO: Only return attributes specified in the BlockSpec, not all attributes (e.g. ordered list item index should
    //  not be included).
    props: blockInfo.contentNode.attrs,
    textContent: blockInfo.contentNode.textContent,
    styledTextContent: styledContentFromNode(node),
    children: children,
  } as Block;

  blockCache.set(node, block);

  return block;
}

export class Editor {
  constructor(private tiptapEditor: TiptapEditor) {}

  private nodeFromBlockUpdate(blockUpdate: BlockUpdate) {
    const content: Node[] = [];

    if (blockUpdate.styledTextContent) {
      for (const styledText of blockUpdate.styledTextContent) {
        const marks = [];

        for (const style of styledText.styles) {
          marks.push(this.tiptapEditor.schema.mark(style.type, style.props));
        }

        content.push(this.tiptapEditor.schema.text(styledText.text, marks));
      }
    }

    const contentNode = this.tiptapEditor.state.schema.nodes[
      blockUpdate.type
    ].create(blockUpdate.props, content);

    const children: Node[] = [];

    if (blockUpdate.children) {
      for (const child of blockUpdate.children) {
        children.push(this.nodeFromBlockUpdate(child));
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

  public get allBlocks(): Block[] {
    const blocks: Block[] = [];

    this.tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(blockFromNode(node));

      return false;
    });

    return blocks;
  }

  public get cursorPosition(): CursorPosition {
    const { node } = getBlockInfoFromPos(
      this.tiptapEditor.state.doc,
      this.tiptapEditor.state.selection.from
    )!;

    return { block: blockFromNode(node) };
  }

  public insertBlocks(
    blocksToInsert: BlockUpdate[],
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

      const nodesToInsert = [];

      for (const blockUpdate of blocksToInsert) {
        nodesToInsert.push(this.nodeFromBlockUpdate(blockUpdate));
      }

      let insertionPos = -1;

      if (placement === "before") {
        insertionPos = pos;
      }

      if (placement === "after") {
        insertionPos = pos + node.nodeSize;
      }

      if (placement === "nested") {
        // Case if block doesn't have children.
        if (node.childCount < 2) {
          insertionPos = pos + node.firstChild!.nodeSize + 1;

          const blockGroupNode = this.tiptapEditor.state.schema.nodes[
            "blockGroup"
          ].create({}, nodesToInsert);

          this.tiptapEditor.view.dispatch(
            this.tiptapEditor.state.tr.insert(insertionPos, blockGroupNode)
          );

          blockFound = true;

          return false;
        }

        insertionPos = pos + node.firstChild!.nodeSize + 2;
      }

      this.tiptapEditor.view.dispatch(
        this.tiptapEditor.state.tr.insert(insertionPos, nodesToInsert)
      );

      blockFound = true;

      return false;
    });

    if (!blockFound) {
      throw Error("Block with given ID does not exist in the document");
    }
  }

  // public firstBlockAsMarkdown(): void {
  //   const node =
  //     this.tiptapEditor.state.doc.firstChild!.firstChild!.firstChild!;
  //
  //   const serializer = DOMSerializer.fromSchema(this.tiptapEditor.schema);
  //   const htmlNode = serializer.serializeNode(node).firstChild!;
  //
  //   const turndownService = new TurndownService();
  //   const markdownNode = turndownService.turndown(htmlNode as HTMLElement);
  //
  //   console.log(node);
  //   console.log(htmlNode);
  //   console.log(markdownNode);
  // }

  public async markdownToBlocks(markdownString: string): Promise<Block[]> {
    const htmlString = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(markdownString);

    const htmlNode = document.createElement("div");
    htmlNode.innerHTML = (htmlString.value as string).trim();

    const parser = DOMParser.fromSchema(this.tiptapEditor.schema);
    const node = parser.parse(htmlNode);

    const blocks: Block[] = [];

    for (let i = 0; i < node.firstChild!.childCount; i++) {
      blocks.push(blockFromNode(node.firstChild!.child(i)));
    }

    return blocks;
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
      const node = this.nodeFromBlockUpdate(block);
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

  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    const htmlString = await this.blocksToHTML(blocks);
    const markdownString = await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemark)
      .use(remarkStringify)
      .process(htmlString);

    return markdownString.value as string;
  }

  // public get markdownAsBlocks(markdownString: string) {
  //   const blockStrings = markdownString.split("\n");
  //
  //   for (let i = 0; i < blockStrings.length; i++) {
  //     const blockString = blockStrings[i];
  //
  //     let type = undefined;
  //     let props = undefined;
  //
  //     if (blockString.startsWith("### ")) {
  //       type = "heading";
  //       props = {
  //         level: "3",
  //       };
  //     } else if (blockString.startsWith("## ")) {
  //       type = "heading";
  //       props = {
  //         level: "2",
  //       };
  //     } else if (blockString.startsWith("# ")) {
  //       type = "heading";
  //       props = {
  //         level: "1",
  //       };
  //     } else if (blockString.match(/^[-+*]\. /)) {
  //       type = "bulletListItem";
  //     } else if (blockString.match(/^\d+\. /)) {
  //       type = "numberedListItem";
  //     }
  //
  //     const children;
  //     if (type === "bulletListItem" || type === "numberedListItem") {
  //     }
  //   }
  // }

  // blocksToMarkdown

  // cursorPosition

  // public get selection

  // public onSelectionChange
}
