import { Editor as TiptapEditor } from "@tiptap/core";
import { DOMParser, DOMSerializer, Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Converter } from "showdown";
import TurndownService from "turndown";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import { Style, StyledText } from "../extensions/Blocks/api/styleTypes";
import { Block, BlockUpdate } from "../extensions/Blocks/api/blockTypes";
import { CursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";

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
  console.log(blockInfo.contentNode);

  if (blockInfo.numChildBlocks === 0) {
    const block = {
      id: blockInfo.id,
      type: blockInfo.contentType.name,
      props: blockInfo.contentNode.attrs,
      textContent: blockInfo.contentNode.textContent,
      styledTextContent: styledContentFromNode(node),
      children: [],
    } as Block;

    blockCache.set(node, block);

    return block;
  }

  const children = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(blockFromNode(blockInfo.node.lastChild!.child(i)));
  }

  const block = {
    id: blockInfo.id,
    type: blockInfo.contentType.name,
    props: blockInfo.contentNode.attrs,
    textContent: blockInfo.contentNode.textContent,
    styledTextContent: styledContentFromNode(node),
    children: children,
  } as Block;

  blockCache.set(node, block);

  return block;
}

export function blocksAreEqual(block1: Block, block2: Block) {
  return JSON.stringify(block1) === JSON.stringify(block2);
}

export function blocksFromState(state: EditorState): Block[] {
  const blocks: Block[] = [];

  state.doc.firstChild!.descendants((node) => {
    blocks.push(blockFromNode(node));

    return false;
  });

  return blocks;
}

// export const blockTypeToMarkdownSymbol = {
//   heading1: "#",
//   heading2: "##",
//   heading3: "###",
//   bulletListItem: "-",
//   numberedListItem: ""
// }

export class Editor {
  constructor(private tiptapEditor: TiptapEditor) {}

  public nodeFromBlockUpdate(blockUpdate: BlockUpdate) {
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
    return blocksFromState(this.tiptapEditor.state);
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
    position: "before" | "after" | "nested"
  ): void {
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

      let insertionPos = -1;
      console.log(pos + node.firstChild!.nodeSize);

      if (position === "before") {
        insertionPos = pos;
      }

      if (position === "after") {
        insertionPos = pos + node.nodeSize;
      }

      // if (position === "nested") {
      //   insertionPos = pos + node.firstChild!.nodeSize + 1;
      // }

      const nodes = [];

      for (const blockUpdate of blocksToInsert) {
        nodes.push(this.nodeFromBlockUpdate(blockUpdate));
      }

      this.tiptapEditor.view.dispatch(
        this.tiptapEditor.state.tr.insert(insertionPos, nodes)
      );

      blockFound = true;

      return false;
    });

    if (!blockFound) {
      throw Error("");
    }
  }

  public firstBlockAsMarkdown(): void {
    const node =
      this.tiptapEditor.state.doc.firstChild!.firstChild!.firstChild!;

    const serializer = DOMSerializer.fromSchema(this.tiptapEditor.schema);
    const htmlNode = serializer.serializeNode(node).firstChild!;

    const turndownService = new TurndownService();
    const markdownNode = turndownService.turndown(htmlNode as HTMLElement);

    console.log(node);
    console.log(htmlNode);
    console.log(markdownNode);
  }

  markdownToBlocks(markdownString: string): void {
    const converter = new Converter();
    const htmlString = converter.makeHtml(markdownString);
    const htmlNode = document.createElement("div");
    htmlNode.innerHTML = htmlString.trim();

    const parser = DOMParser.fromSchema(this.tiptapEditor.schema);
    const node = parser.parse(htmlNode);

    console.log(markdownString);
    console.log(htmlString);
    console.log(htmlNode);
    console.log(node);

    // this.tiptapEditor.commands.setContent(htmlString);
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
