/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
  Spread,
  TextNode,
} from "lexical";

export type SerializedChildgroupNode = Spread<
  {
    type: "childgroup";
    version: 1;
  },
  SerializedElementNode
>;

export class ChildgroupNode extends ElementNode {
  static getType(): string {
    return "childgroup";
  }

  static clone(node: ChildgroupNode) {
    return new ChildgroupNode(node.__key);
  }

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(key?: NodeKey) {
    super(key);
  }

  canBeEmpty(): boolean {
    return false;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("childgroup");
    dom.style.userSelect = "none";
    return dom;
  }

  updateDOM(
    _prevNode: TextNode,
    _dom: HTMLElement,
    _config: EditorConfig
  ): boolean {
    // return super.updateDOM(prevNode, dom, config);
    return false;
  }

  select(
    _anchorOffset?: number | undefined,
    _focusOffset?: number | undefined
  ): RangeSelection {
    debugger;
    return super.select(_anchorOffset, _focusOffset);
  }

  selectStart(): RangeSelection {
    debugger;
    return super.selectStart();
  }

  insertBeforeDOM(
    dom: HTMLElement,
    childDOM: HTMLElement,
    referenceNode: Node | null
  ): void {
    // debugger;
    // childDOM.setAttribute('data-init', 'true');
    // childDOM.setAttribute('data-animating', 'true');
    super.insertBeforeDOM(dom, childDOM, referenceNode);
    // setTimeout(() => {
    //   childDOM.removeAttribute('data-init');
    // }, 0);
  }

  static importJSON(_serializedNode: SerializedChildgroupNode): ChildgroupNode {
    const node = $createChildgroupNode();
    return node;
  }

  exportJSON(): SerializedChildgroupNode {
    return {
      ...super.exportJSON(),
      type: "childgroup",
      version: 1,
    };
  }

  getClassName(): string {
    const self = this.getLatest();
    return self.__className;
  }
}

export function $isChildgroupNode(
  node: LexicalNode | null | undefined
): node is ChildgroupNode {
  return node instanceof ChildgroupNode;
}

export function $createChildgroupNode(): ChildgroupNode {
  return new ChildgroupNode();
}
