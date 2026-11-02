import type { Node as PMNode } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";

export type Item = Readonly<{
  id: string;
  owner: boolean;
  members: readonly string[];
}>;

function collect(
  node: PMNode,
  types: ReadonlySet<string>,
  items: Decoration[],
  pos: number,
  nextId: { value: number },
) {
  if (node.isLeaf || node.isTextblock) {
    return;
  }

  const children = node.content.content;
  let start = 0;
  let startOffset = 0;
  while (start < children.length) {
    const firstChild = children[start];
    const first =
      firstChild.type.name === "blockContainer" ? firstChild.firstChild : null;
    let end = start + 1;
    let endOffset = startOffset + firstChild.nodeSize;
    while (
      first &&
      end < children.length &&
      (children[end].type.name === "blockContainer"
        ? children[end].firstChild
        : null
      )?.type === first.type
    ) {
      endOffset += children[end].nodeSize;
      end++;
    }

    if (first && types.has(first.type.name)) {
      const ids: string[] = [];
      for (let index = 0; index < end - start; index++) {
        ids[index] = `bn-list-item-${++nextId.value}`;
      }

      let offset = startOffset;
      for (let index = 0; index < end - start; index++) {
        const child = children[start + index];
        const item: Item = {
          id: ids[index],
          owner: index === 0,
          members: index === 0 ? ids.slice(1) : [],
        };
        const itemPos = pos + 2 + offset;
        const itemNode = child.firstChild!;
        items.push(
          Decoration.node(
            itemPos,
            itemPos + itemNode.nodeSize,
            {},
            {
              listItem: item,
            },
          ),
        );
        offset += child.nodeSize;
      }
    }

    startOffset = endOffset;
    start = end;
  }

  let offset = 0;
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    collect(child, types, items, pos + 1 + offset, nextId);
    offset += child.nodeSize;
  }
}

export function createListDecorations(doc: PMNode, types: ReadonlySet<string>) {
  const items: Decoration[] = [];
  collect(doc, types, items, -1, { value: 0 });
  return DecorationSet.create(doc, items);
}
