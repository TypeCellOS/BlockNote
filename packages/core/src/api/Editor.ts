import { Editor as TiptapEditor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Block } from "../extensions/Blocks/api/apiTypes";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";

const cache = new WeakMap<Node, Block>();

export function blockFromPMNode(node: Node): Block {
  const cachedBlock = cache.get(node);
  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoFromPos(node, 0)!;
  console.log("block", blockInfo);
  const children: Block[] = [];
  for (let i = 0; i < blockInfo.numChildBlocks; i++) {
    children.push(blockFromPMNode(blockInfo.node.lastChild!.child(i)));
  }

  const block = {
    children,
    id: blockInfo.id,
    props: blockInfo.contentNode.attrs,
    type: blockInfo.contentType.name as any,
  };

  cache.set(node, block);

  return block;
}

export function blocksFromPMState(state: EditorState): Block[] {
  const blocks: Block[] = [];

  state.doc.firstChild!.descendants((node) => {
    blocks.push(blockFromPMNode(node));

    return false;
  });

  return blocks;
}

export class Editor {
  constructor(private tiptapEditor: TiptapEditor) {}

  public get blocks(): Block[] {
    return blocksFromPMState(this.tiptapEditor.state);
  }

  // blocksToMarkdown

  // cursorPosition

  // public get selection

  // public onSelectionChange
}
