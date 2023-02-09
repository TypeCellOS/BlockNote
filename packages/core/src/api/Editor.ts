import { Editor as TiptapEditor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Block } from "../extensions/Blocks/api/apiTypes";

const cache = new WeakMap<Node, Block>();

export function blockFromPMNode(node: Node): Block {
  let ret = cache.get(node);
  if (ret) {
    return ret;
  }
  // convert Node to block
  // go recursive blockFromPMNode to get children

  // set cache
  return {} as Block;
}

export function blocksFromPMState(_state: EditorState) {
  return {} as Block[];
}

export class Editor {
  constructor(private _tiptapEditor: TiptapEditor) {}

  public get blocks(): Block[] {
    return blocksFromPMState(this._tiptapEditor.state);
  }

  // blocksToMarkdown

  // cursorPosition

  // public get selection

  // public onSelectionChange
}
