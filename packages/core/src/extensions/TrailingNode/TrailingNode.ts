import type { Node as PMNode } from "prosemirror-model";
import {
  Plugin,
  PluginKey,
  Selection,
  type Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey<DecorationSet>("trailingNode");

// Skip the widget when the container already ends with an empty paragraph
// block (since the user can just type into it).
function containerNeedsTrailingWidget(container: PMNode): boolean {
  const lastBlock = container.lastChild;
  const lastContent = lastBlock?.firstChild;

  return !(
    lastBlock?.type.name === "blockContainer" &&
    lastContent?.type.name === "paragraph" &&
    lastContent.content.size === 0
  );
}

// Returns the position at the end of each container that should render a
// trailing widget: the root blockGroup, and columns from the multi-column
// package. Nested blockGroups (a block's children) are excluded, as they have
// no empty space below them for a widget to occupy.
function getTrailingWidgetPositions(doc: PMNode): number[] {
  // When the schema has no columns, the root blockGroup is the only possible
  // container, so traversing the doc to find others can be skipped.
  if (!doc.type.schema.nodes["column"]) {
    const rootGroup = doc.lastChild;
    return rootGroup && containerNeedsTrailingWidget(rootGroup)
      ? [doc.content.size - 1]
      : [];
  }

  const positions: number[] = [];

  doc.descendants((node, pos, parent) => {
    if (node.isTextblock) {
      return false;
    }

    const isContainer =
      node.type.name === "column" ||
      (node.type.name === "blockGroup" && parent?.type.name === "doc");

    if (isContainer && containerNeedsTrailingWidget(node)) {
      positions.push(pos + node.nodeSize - 1);
    }

    return true;
  });

  return positions;
}

/**
 * Renders a fake trailing block as a widget decoration after the last block of
 * the document, as well as of any other container that blocks can be appended
 * to (e.g. columns). Clicking it inserts a real trailing block in the
 * container and moves the selection into it. This way the trailing block is
 * not part of the document content, so it doesn't appear when the editor is
 * read-only or when the content is exported.
 */
export const TrailingNodeExtension = createExtension(
  ({ editor }: ExtensionOptions) => {
    function createTrailingWidget(pos: number): Decoration {
      return Decoration.widget(
        pos,
        () => {
          const el = document.createElement("div");
          el.className = "bn-trailing-block";
          el.contentEditable = "false";
          el.addEventListener("mousedown", (event) => {
            // Stop ProseMirror from trying to place the selection somewhere
            // based on this click.
            event.preventDefault();

            const view = editor.prosemirrorView;
            if (!view) {
              return;
            }

            // The widget may have been remapped since it was created, so its
            // container is resolved from its current DOM position instead of
            // captured up front.
            const container = view.state.doc.resolve(
              view.posAtDOM(el, 0),
            ).parent;
            const lastBlockId = container.lastChild?.attrs["id"];
            if (!lastBlockId) {
              return;
            }

            editor.transact((tr) => {
              const [insertedBlock] = editor.insertBlocks(
                [{ type: "paragraph" }],
                lastBlockId,
                "after",
              );
              editor.setTextCursorPosition(insertedBlock, "start");
              tr.scrollIntoView();
            });

            view.focus();
          });
          return el;
        },
        { side: 1 },
      );
    }

    // Maps the existing DecorationSet through the transaction, then diffs it
    // against the containers that should currently show a widget, only adding
    // and removing where the two differ. Decorations (and their rendered DOM)
    // stay reference-stable across transactions for unchanged containers.
    function nextDecorationSet(
      tr: Transaction,
      oldSet: DecorationSet,
      isEditable: boolean,
    ): DecorationSet {
      const mapped = oldSet.map(tr.mapping, tr.doc);
      const desiredPositions = new Set(
        isEditable ? getTrailingWidgetPositions(tr.doc) : [],
      );

      const keptPositions = new Set<number>();
      const stale: Decoration[] = [];
      for (const decoration of mapped.find()) {
        if (
          desiredPositions.has(decoration.from) &&
          !keptPositions.has(decoration.from)
        ) {
          keptPositions.add(decoration.from);
        } else {
          stale.push(decoration);
        }
      }
      const missing = [...desiredPositions].filter(
        (pos) => !keptPositions.has(pos),
      );

      let next = mapped;
      if (stale.length > 0) {
        next = next.remove(stale);
      }
      if (missing.length > 0) {
        next = next.add(tr.doc, missing.map(createTrailingWidget));
      }
      return next;
    }

    return {
      key: "trailingNode",
      prosemirrorPlugins: [
        new Plugin<DecorationSet>({
          key: PLUGIN_KEY,
          state: {
            init: (_, state) =>
              nextDecorationSet(
                state.tr,
                DecorationSet.empty,
                editor.isEditable,
              ),
            apply: (tr, oldSet) => {
              if (!tr.docChanged && !tr.getMeta(PLUGIN_KEY)) {
                return oldSet;
              }
              return nextDecorationSet(tr, oldSet, editor.isEditable);
            },
          },
          // Editable changes don't dispatch a transaction on their own, so the
          // plugin state can't re-evaluate on its own. Watch for the change
          // and dispatch a no-op transaction tagged with this plugin's key so
          // `apply` re-runs and adds or removes the widget.
          view(view) {
            let lastEditable = view.editable;
            return {
              update(view) {
                if (view.editable === lastEditable) {
                  return;
                }
                lastEditable = view.editable;
                view.dispatch(view.state.tr.setMeta(PLUGIN_KEY, true));
              },
            };
          },
          props: {
            decorations: (state) => PLUGIN_KEY.getState(state),
            // Prevents ProseMirror from trying to move the selection into the
            // trailing block at the end of the document, which causes the text
            // caret to flicker in it before returning to its previous
            // position.
            handleKeyDown: (view, event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowDown") {
                return false;
              }

              const { selection } = view.state;
              if (!selection.empty) {
                return false;
              }

              const docEnd = Selection.atEnd(view.state.doc);
              if (selection.$head.pos !== docEnd.$head.pos) {
                return false;
              }

              const rootGroup = view.state.doc.lastChild;
              if (
                !editor.isEditable ||
                !rootGroup ||
                !containerNeedsTrailingWidget(rootGroup)
              ) {
                return false;
              }

              event.preventDefault();
              return true;
            },
          },
        }),
      ],
    } as const;
  },
);
