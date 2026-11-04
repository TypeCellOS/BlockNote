import { uuidv4 } from "lib0/random";
import { Plugin, PluginKey } from "prosemirror-state";
import { DecorationSet, type DecorationSource } from "prosemirror-view";

import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { Item } from "./ListMembership.js";
import { createListDecorations } from "./ListMembership.js";
import { changesOnlyInlineContent } from "./inlineContentChange.js";

type ListState = { decorations: DecorationSet };
export const listAccessibilityKey = new PluginKey<ListState>(
  "listAccessibility",
);

export function createListAccessibilityPlugin(types: ReadonlySet<string>) {
  return new Plugin<ListState>({
    key: listAccessibilityKey,
    state: {
      init(_, state) {
        return { decorations: createListDecorations(state.doc, types) };
      },
      apply(tr, before) {
        if (!tr.docChanged) {
          return before;
        }
        const inline = changesOnlyInlineContent(tr);
        if (inline) {
          return {
            decorations: before.decorations.map(tr.mapping, tr.doc),
          };
        }
        return {
          decorations: createListDecorations(tr.doc, types),
        };
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)!.decorations;
      },
    },
  });
}

/** A local NodeView adapter: no positions, node identity index or DOM registry. */
export function listBlockAttributes(
  outer: HTMLElement,
  inner: HTMLElement,
  decorations: DecorationSource,
  idForItem: (itemId: string) => string,
) {
  let original:
    | {
        id: string | null;
        role: string | null;
        outerRole: string | null;
        owns: string | null;
      }
    | undefined;
  let previous: Item | undefined;
  function set(
    element: HTMLElement,
    name: string,
    value: string | null | undefined,
  ) {
    if (value == null) {
      if (element.hasAttribute(name)) {
        element.removeAttribute(name);
      }
    } else if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
  function apply(decorations: DecorationSource) {
    let item: Item | undefined;
    decorations.forEachSet((set) => {
      item ??= set.find(1, 2, (spec) => spec.listItem)[0]?.spec.listItem;
    });
    if (item === previous) {
      return;
    }
    previous = item;
    if (item && !original) {
      original = {
        id: inner.getAttribute("id"),
        role: inner.getAttribute("role"),
        outerRole: outer.getAttribute("role"),
        owns: outer.getAttribute("aria-owns"),
      };
    }
    const itemIds = item ? [item.id, ...item.members] : [];
    const ids = itemIds.map(idForItem);
    const id = item ? ids[0] : undefined;
    const owns =
      item?.owner && item.members.length ? ids.slice(1).join(" ") : undefined;
    set(inner, "id", item ? id : original?.id);
    set(inner, "role", item ? "listitem" : original?.role);
    set(
      outer,
      "role",
      item ? (item.owner ? "list" : undefined) : original?.outerRole,
    );
    set(outer, "aria-owns", owns ?? (item ? undefined : original?.owns));
    if (!item) {
      original = undefined;
    }
  }
  apply(decorations);
  return {
    update: apply,
    destroy() {
      apply(DecorationSet.empty);
    },
  };
}

const viewIds = new WeakMap<object, string>();

export function listItemId(view: object, itemId: string) {
  let prefix = viewIds.get(view);
  if (!prefix) {
    prefix = `bn-list-view-${uuidv4()}-`;
    viewIds.set(view, prefix);
  }
  return `${prefix}${itemId}`;
}

export const ListAccessibilityExtension = createExtension(({ editor }) => ({
  key: "listAccessibility",
  prosemirrorPlugins: [
    createListAccessibilityPlugin(
      new Set(
        Object.values(editor.schema.blockSpecs)
          .filter(
            (spec) =>
              spec.implementation.meta?.listItem && !spec.config.layoutOnly,
          )
          .map((spec) => spec.config.type),
      ),
    ),
  ],
}));
