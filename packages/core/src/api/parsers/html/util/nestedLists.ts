function getChildIndex(node: Element) {
  return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
}

function isWhitespaceNode(node: Node) {
  return node.nodeType === 3 && !/\S/.test(node.nodeValue || "");
}

/**
 * Step 0, wraps any `<li>` element that is not inside a `<ul>`/`<ol>` in a
 * fresh `<ul>` so the existing parse rules (which require an `<ul>`/`<ol>`
 * parent) match. Consecutive orphan `<li>` siblings are grouped under a
 * single `<ul>`.
 *
 * Without this, pasting bare `<li>a</li><li>b</li>` HTML would parse as two
 * paragraphs because the BulletListItem parse rule only matches `<li>`
 * whose parent is `<ul>`.
 */
function wrapOrphanListItems(element: HTMLElement) {
  const orphans = Array.from(element.querySelectorAll("li")).filter(
    (li) => li.closest("ul, ol") === null,
  );
  const orphanSet = new Set(orphans);
  const handled = new Set<Element>();

  for (const orphan of orphans) {
    if (handled.has(orphan)) {
      continue;
    }

    const group: Element[] = [orphan];
    handled.add(orphan);

    let next = orphan.nextElementSibling;
    while (next && next.tagName === "LI" && orphanSet.has(next as HTMLElement)) {
      group.push(next);
      handled.add(next);
      next = next.nextElementSibling;
    }

    const ul = orphan.ownerDocument.createElement("ul");
    orphan.parentNode!.insertBefore(ul, orphan);
    for (const li of group) {
      ul.appendChild(li);
    }
  }
}

/**
 * Step 1, Turns:
 *
 * <ul>
 *  <li>item</li>
 *  <li>
 *   <ul>
 *      <li>...</li>
 *      <li>...</li>
 *   </ul>
 * </li>
 *
 * Into:
 * <ul>
 *  <li>item</li>
 *  <ul>
 *      <li>...</li>
 *      <li>...</li>
 *  </ul>
 * </ul>
 *
 */
function liftNestedListsToParent(element: HTMLElement) {
  element.querySelectorAll("li > ul, li > ol").forEach((list) => {
    const index = getChildIndex(list);
    const parentListItem = list.parentElement!;
    const siblingsAfter = Array.from(parentListItem.childNodes).slice(
      index + 1,
    );
    list.remove();
    siblingsAfter.forEach((sibling) => {
      sibling.remove();
    });

    parentListItem.insertAdjacentElement("afterend", list);

    siblingsAfter.reverse().forEach((sibling) => {
      if (isWhitespaceNode(sibling)) {
        return;
      }
      const siblingContainer = document.createElement("li");
      siblingContainer.append(sibling);
      list.insertAdjacentElement("afterend", siblingContainer);
    });
    if (parentListItem.childNodes.length === 0) {
      parentListItem.remove();
    }
  });
}

/**
 * Step 2, Turns (output of liftNestedListsToParent):
 *
 * <li>item</li>
 * <ul>
 *   <li>...</li>
 *   <li>...</li>
 * </ul>
 *
 * Into:
 * <div>
 *  <li>item</li>
 *  <div data-node-type="blockGroup">
 *      <ul>
 *          <li>...</li>
 *          <li>...</li>
 *      </ul>
 *  </div>
 * </div>
 *
 * This resulting format is parsed
 */
function createGroups(element: HTMLElement) {
  element.querySelectorAll("li + ul, li + ol").forEach((list) => {
    const listItem = list.previousElementSibling as HTMLElement;
    const blockContainer = document.createElement("div");

    listItem.insertAdjacentElement("afterend", blockContainer);
    blockContainer.append(listItem);

    const blockGroup = document.createElement("div");
    blockGroup.setAttribute("data-node-type", "blockGroup");
    blockContainer.append(blockGroup);

    while (
      blockContainer.nextElementSibling?.nodeName === "UL" ||
      blockContainer.nextElementSibling?.nodeName === "OL"
    ) {
      blockGroup.append(blockContainer.nextElementSibling);
    }
  });
}

// prevent XSS, similar to https://github.com/ProseMirror/prosemirror-view/blob/1251b2b412656a2a06263e4187574beb43651273/src/clipboard.ts#L204
// https://github.com/TypeCellOS/BlockNote/issues/601
let _detachedDoc: Document | null = null;
function detachedDoc() {
  return (
    _detachedDoc ||
    (_detachedDoc = document.implementation.createHTMLDocument("title"))
  );
}

export function nestedListsToBlockNoteStructure(
  elementOrHTML: HTMLElement | string,
) {
  if (typeof elementOrHTML === "string") {
    const element = detachedDoc().createElement("div");
    element.innerHTML = elementOrHTML;
    elementOrHTML = element;
  }
  wrapOrphanListItems(elementOrHTML);
  liftNestedListsToParent(elementOrHTML);
  createGroups(elementOrHTML);
  return elementOrHTML;
}
