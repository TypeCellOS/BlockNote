import { Editor as TiptapEditor } from "@tiptap/core";
import { DOMParser, Node } from "prosemirror-model";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import { Block, BlockUpdate } from "../extensions/Blocks/api/blockTypes";
import { CursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";

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

    return this.tiptapEditor.state.schema.nodes["blockContainer"].create(
      {},
      contentNode
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
      .use(rehypeSanitize)
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

  public get blocksAsMarkdown(): string {
    let markdown = "";

    this.tiptapEditor.state.doc.firstChild!.descendants((node, pos) => {
      if (node.type.name !== "blockContainer") {
        return true;
      }
      // console.log(pos, node);
      // return true;

      const blockInfo = getBlockInfoFromPos(
        this.tiptapEditor.state.doc,
        pos + 2
      )!;

      if (blockInfo.contentType.name === "heading") {
        for (let i = 0; i < blockInfo.contentNode.attrs.level; i++) {
          markdown += "#";
        }
        markdown += " ";
      } else if (blockInfo.contentType.name === "bulletListItem") {
        let ancestorBlockInfo = getBlockInfoFromPos(
          this.tiptapEditor.state.doc,
          blockInfo.startPos - 1
        )!;
        console.log(ancestorBlockInfo);

        while (
          ancestorBlockInfo &&
          (ancestorBlockInfo.contentType.name === "bulletListItem" ||
            ancestorBlockInfo.contentType.name === "numberedListItem")
        ) {
          markdown += "    ";

          ancestorBlockInfo = getBlockInfoFromPos(
            this.tiptapEditor.state.doc,
            ancestorBlockInfo.startPos - 1
          )!;
        }
        markdown += "- ";
      } else if (blockInfo.contentType.name === "numberedListItem") {
        let ancestorBlockInfo = getBlockInfoFromPos(
          this.tiptapEditor.state.doc,
          blockInfo.startPos - 1
        )!;

        while (
          ancestorBlockInfo &&
          ancestorBlockInfo.contentType.name !== "bulletListItem" &&
          ancestorBlockInfo.contentType.name !== "numberedListItem"
        ) {
          markdown += "    ";

          ancestorBlockInfo = getBlockInfoFromPos(
            this.tiptapEditor.state.doc,
            ancestorBlockInfo.startPos - 1
          )!;
        }
        markdown += blockInfo.contentNode.attrs["index"] + " ";
      }

      markdown += blockInfo.contentNode.textContent + "\r\n";

      return true;
    });

    return markdown;
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
