import { Selection, TextSelection } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

/**
 * Inline-content counterpart of {@link SourceBlockWithPreviewExtension}. A
 * single editor-wide extension that drives the source popup for inline content
 * that renders a preview. Which inline content it activates on is decided by
 * each spec's `meta.hasPreview` flag, so individual inline content opts in
 * rather than the extension being configured with a type.
 *
 * Unlike the block version, the popup isn't toggled with a separate state flag:
 * it's open exactly when the selection is inside the inline content's source.
 * The store therefore only tracks which inline content (by its position) holds
 * the selection - moving the selection in opens its popup, moving it out closes
 * it. Since the source popup is always laid out (just hidden via opacity), the
 * cursor can navigate into and out of it with the arrow keys as usual.
 *
 * The extension is registered once (it's a default extension) and is a no-op
 * when no inline content declares `meta.hasPreview`.
 */
export const SourceInlineContentWithPreviewExtension = createExtension(
  ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
    const store = createStore<{
      selected: number | undefined;
    }>({
      selected: undefined,
    });

    // Inline content has a preview iff its spec's implementation declares
    // `meta.hasPreview`.
    const nodeHasPreview = (nodeName: string) =>
      !!editor.schema.inlineContentSpecs[nodeName]?.implementation?.meta
        ?.hasPreview;

    // Moves the selection out of the inline content, to just `"before"` or
    // `"after"` it, which closes the popup via the selection-change handler
    // below. Lets the keyboard commit-and-exit the source the same way arrowing
    // past its edge does, keeps Enter from splitting the block while editing the
    // source, and lets the up/down arrows step out of the source rather than
    // staying trapped inside it.
    const moveSelectionOut =
      (direction: "before" | "after") =>
      ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
        const { $from } = editor.prosemirrorState.selection;
        const node = $from.node();
        if (!nodeHasPreview(node.type.name)) {
          return false;
        }

        const view = editor.prosemirrorView!;
        const selection = Selection.near(
          view.state.doc.resolve(
            direction === "before" ? $from.before() : $from.after(),
          ),
          direction === "before" ? -1 : 1,
        );
        view.dispatch(view.state.tr.setSelection(selection));

        return true;
      };

    return {
      key: "sourceInlineContentWithPreview",
      store,
      keyboardShortcuts: {
        Enter: moveSelectionOut("after"),
        Escape: moveSelectionOut("after"),
        ArrowUp: moveSelectionOut("before"),
        ArrowDown: moveSelectionOut("after"),
        // While editing the source, selects the whole source instead of the
        // whole document.
        "Mod-a": ({ editor }) => {
          const { $from } = editor.prosemirrorState.selection;
          if (!nodeHasPreview($from.node().type.name)) {
            return false;
          }

          const view = editor.prosemirrorView!;
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.doc, $from.start(), $from.end()),
            ),
          );

          return true;
        },
      },
      mount: ({ dom, signal }) => {
        // The popup is open exactly when the selection is inside the inline
        // content, so we just track which inline content (if any) holds it.
        const unsubscribeSelectionChange = editor.onSelectionChange(() => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();

          store.setState({
            selected: nodeHasPreview(node.type.name)
              ? $from.before()
              : undefined,
          });
        });
        signal.addEventListener("abort", unsubscribeSelectionChange);

        // Sets `visibility: hidden` on the popup for a single frame when pressing up/down arrow
        // keys. The popup is normally hidden through `opacity: 0`, which means it's still visible
        // to the browser for navigation. Therefore, the up/down arrows can sometimes move the
        // selection into the popup from unexpected positions, such as on the same line. Setting
        // `visibility: hidden` makes the browser ignore it when determining the new selection.
        const handleVerticalArrow = (event: KeyboardEvent) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
            return;
          }

          // When the selection is already inside a source, leave navigation
          // (moving within or out of it) to the browser as usual.
          const { $from } = editor.prosemirrorState.selection;
          if (nodeHasPreview($from.node().type.name)) {
            return;
          }

          dom.classList.add("bn-suppress-source-popup-caret");
          requestAnimationFrame(() =>
            dom.classList.remove("bn-suppress-source-popup-caret"),
          );
        };
        dom.addEventListener("keydown", handleVerticalArrow, {
          capture: true,
          signal,
        });

        const handleBlur = () => store.setState({ selected: undefined });
        dom.addEventListener("blur", handleBlur, { capture: true, signal });
      },
    };
  },
);
