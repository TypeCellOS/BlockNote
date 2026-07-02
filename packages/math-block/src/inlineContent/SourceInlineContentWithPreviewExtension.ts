import { BlockNoteEditor, createExtension, createStore } from "@blocknote/core";
import {
  InputRule,
  inputRules as inputRulesPlugin,
} from "@handlewithcare/prosemirror-inputrules";
import { Selection } from "prosemirror-state";

/**
 * Inline-content counterpart of {@link SourceBlockWithPreviewExtension}. Drives
 * the source popup for inline content with a preview.
 *
 * Unlike the block version, the popup isn't toggled with a separate state flag:
 * it's open exactly when the selection is inside the inline content's source.
 * The store therefore only tracks which inline content (by its position) holds
 * the selection - moving the selection in opens its popup, moving it out closes
 * it. Since the source popup is always laid out (just hidden via opacity), the
 * cursor can navigate into and out of it with the arrow keys as usual.
 */
export const SourceInlineContentWithPreviewExtension = createExtension(
  ({
    editor,
    options: { key, inlineContentType, runsBefore = [] },
  }: {
    editor: BlockNoteEditor<any, any, any>;
    options: {
      key: string;
      inlineContentType: string;
      runsBefore?: readonly string[];
    };
  }) => {
    const store = createStore<{
      selected: number | undefined;
    }>({
      selected: undefined,
    });

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
        if (node.type.name !== inlineContentType) {
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
      key,
      store,
      runsBefore,
      keyboardShortcuts: {
        Enter: moveSelectionOut("after"),
        Escape: moveSelectionOut("after"),
        ArrowUp: moveSelectionOut("before"),
        ArrowDown: moveSelectionOut("after"),
      },
      // Cannot use `inputRules` field as it only allows for converting matched content to blocks.
      prosemirrorPlugins: [
        inputRulesPlugin({
          rules: [/\$([^$]+)\$$/, /\\\((.+?)\\\)$/].map(
            (find) =>
              new InputRule(find, (state, match, start, end) => {
                const source = match[1]?.trim();
                const nodeType = state.schema.nodes[inlineContentType];
                if (!source || !nodeType) {
                  return null;
                }

                return state.tr.replaceRangeWith(
                  start,
                  end,
                  nodeType.create(null, state.schema.text(source)),
                );
              }),
          ),
        }),
      ],
      mount: ({ dom, signal }) => {
        // The popup is open exactly when the selection is inside the inline
        // content, so we just track which inline content (if any) holds it.
        const unsubscribeSelectionChange = editor.onSelectionChange(() => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();

          store.setState({
            selected:
              node.type.name === inlineContentType ? $from.before() : undefined,
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
          if ($from.node().type.name === inlineContentType) {
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
      },
    };
  },
);
