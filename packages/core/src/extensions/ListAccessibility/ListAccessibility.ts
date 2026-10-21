import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { createExtension } from "../../editor/BlockNoteExtension.js";
import { UniqueID } from "../tiptap-extensions/UniqueID/UniqueID.js";

const pluginKey = new PluginKey<DecorationSet>("list-accessibility");

/** Supplies read-only list ownership without changing the block hierarchy. */
export const ListAccessibilityExtension = createExtension(({ editor }) => {
  const prefix = `bn-list-item-${UniqueID.options.generateID()}`;

  function decorate(doc: Node): DecorationSet {
    const decorations: Decoration[] = [];

    function visit(parent: Node, start: number) {
      let run: { type: string; pos: number; ids: string[] } | undefined;

      function finishRun() {
        if (!run) {
          return;
        }
        const owns = run.ids.join(" ");
        decorations.push(
          Decoration.widget(
            run.pos,
            (view) => {
              const dom = view.dom.ownerDocument.createElement("div");
              dom.setAttribute("role", "list");
              dom.setAttribute("aria-owns", owns);
              // Keep the owner in the accessibility tree without affecting
              // layout. display:none/visibility:hidden would hide the list.
              dom.style.cssText =
                "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
              return dom;
            },
            { side: -1, key: owns, ignoreSelection: true },
          ),
        );
        run = undefined;
      }

      parent.forEach((node, offset) => {
        const pos = start + offset;
        const type =
          node.type.name === "blockContainer"
            ? node.firstChild?.type.name
            : undefined;
        if (
          type &&
          editor.schema.blockSpecs[type]?.implementation.meta.listItem
        ) {
          if (run && run.type !== type) {
            finishRun();
          }
          const currentRun = (run ??= { type, pos, ids: [] });
          // Namespace IDs per editor, including when the same document is
          // mounted twice. Encode block IDs so whitespace cannot split IDREFs.
          const id = `${prefix}-${
            typeof node.attrs.id === "string"
              ? `id-${encodeURIComponent(node.attrs.id)}`
              : `pos-${pos}`
          }`;
          currentRun.ids.push(id);
          // A blockContainer's root is .bn-block-outer: the item includes its
          // children, including paragraphs and any nested lists.
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              id,
              role: "listitem",
            }),
          );
        } else {
          finishRun();
        }
        if (!node.isLeaf && !node.isTextblock) {
          visit(node, pos + 1);
        }
      });
      finishRun();
    }

    visit(doc, 0);
    return DecorationSet.create(doc, decorations);
  }

  return {
    key: "listAccessibility",
    prosemirrorPlugins: [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (tr, previous) =>
            tr.docChanged ? decorate(tr.doc) : previous,
        },
        props: {
          // ReadOnlyExtension dispatches when editability changes, so this
          // also removes both owners and item attributes when editing resumes.
          decorations: (state) =>
            editor.isEditable ? DecorationSet.empty : pluginKey.getState(state),
        },
      }),
    ],
  };
});
