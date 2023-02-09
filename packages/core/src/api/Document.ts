import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Block } from "../extensions/Blocks/apiTypes";

const cache = new WeakMap<Node, Block>();

export function BlockFromPMNode(node: Node): Block {
  let ret = cache.get(node);
  if (ret) {
    return ret;
  }
  // convert Node to bloc
  // set cache
}

export function DocumentFromPMState(state: EditorState) {}
