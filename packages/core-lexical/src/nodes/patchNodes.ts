import {
  $isElementNode,
  $isTextNode,
  EditorConfig,
  ElementNode,
  RangeSelection,
} from "lexical";
import { $isChildgroupNode } from "./ChildgroupNode";

export function patchNode(node: any) {
  const origCreateDOM = node.prototype.createDOM;

  node.prototype.selectStart = function selectStart(
    this: ElementNode
  ): RangeSelection {
    // debugger;
    const firstNode = this.getFirstChild();
    if (!$isChildgroupNode(firstNode)) {
      const firstNode = this.getFirstDescendant();
      if ($isElementNode(firstNode) || $isTextNode(firstNode)) {
        return firstNode.select(0, 0);
      }
      // Decorator or LineBreak
      if (firstNode !== null) {
        return firstNode.selectPrevious();
      }
    }
    return this.select(0, 0);
  };

  node.prototype.createDOM = function createDOM(
    config: EditorConfig
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.userSelect = "none";
    // const nonEditableContent = document.createElement('div');
    // nonEditableContent.setAttribute('contenteditable', 'false');

    const element = origCreateDOM.call(this, config);
    element.setAttribute("data-gap", "true");
    element.style.userSelect = "all";
    // addClassNamesToElement(element, config.theme.quote);

    wrapper.appendChild(element);
    return wrapper;
  };

  node.prototype.insertBeforeDOM = function insertBeforeDOM(
    dom: HTMLElement,
    childDOM: HTMLElement,
    referenceNode: Node | null
  ): void {
    if (
      childDOM.className === "childgroup" //||
      // (dom as any).__lexicalLineBreak === childDOM
    ) {
      dom.insertBefore(childDOM, null);
      return;
    }

    dom
      .querySelector(":scope > [data-gap]")!
      .insertBefore(childDOM, referenceNode);
  };

  node.prototype.removeChildDOM = function removeChildDOM(
    dom: HTMLElement,
    childDOM: HTMLElement
  ): void {
    if (childDOM.className === "childgroup") {
      dom.removeChild(childDOM);
      return;
    }
    dom.querySelector(":scope > [data-gap]")!.removeChild(childDOM);
  };

  node.prototype.replaceChildDOM = function replaceChildDOM(
    dom: HTMLElement,
    newChildDOM: HTMLElement,
    oldChildDOM: Node
  ): void {
    if (newChildDOM.className === "childgroup") {
      dom.replaceChild(newChildDOM, oldChildDOM);
      return;
    }
    dom
      .querySelector(":scope > [data-gap]")!
      .replaceChild(newChildDOM, oldChildDOM);
  };

  node.prototype.fastClearDOM = function (dom: HTMLElement): void {
    dom.querySelector(":scope > [data-gap]")!.textContent = "";
  };

  node.prototype.getFirstChildDOM = function (dom: HTMLElement) {
    return dom.querySelector(":scope > [data-gap]")!.firstChild;
  };
}
