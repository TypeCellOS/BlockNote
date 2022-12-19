import { Editor, isTextSelection } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BubbleMenuFactory } from "../../menu-tools/BubbleMenu/types";
import { getBubbleMenuProps } from "../../menu-tools/BubbleMenu/getBubbleMenuProps";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface BubbleMenuPluginProps {
  pluginKey: PluginKey;
  editor: Editor;
  bubbleMenuFactory: BubbleMenuFactory;
  shouldShow?:
    | ((props: {
        editor: Editor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
        from: number;
        to: number;
      }) => boolean)
    | null;
}

export const createBubbleMenuPlugin = (options: BubbleMenuPluginProps) => {
  const bubbleMenu = options.bubbleMenuFactory(
    getBubbleMenuProps(options.editor)
  );

  // TODO: Is this callback needed?
  const mousedownHandler = (_view: EditorView) => {
    // view.dispatch(
    //   view.state.tr.setMeta(options.pluginKey, {
    //     preventHide: true,
    //   })
    // );
  };

  const viewMousedownHandler = (view: EditorView) => {
    view.dispatch(
      view.state.tr.setMeta(options.pluginKey, {
        preventShow: true,
      })
    );
  };

  const viewMouseupHandler = (view: EditorView) => {
    view.dispatch(
      view.state.tr.setMeta(options.pluginKey, {
        preventShow: false,
      })
    );
  };

  const dragstartHandler = () => {
    bubbleMenu.hide();
  };

  // TODO: Is this callback needed?
  const focusHandler = () => {
    // we use `setTimeout` to make sure `selection` is already updated
    // setTimeout(() => this.update(this.editor.view));
  };

  const blurHandler = ({ event }: { event: FocusEvent }, view: EditorView) => {
    const pluginState = options.pluginKey.getState(view.state);

    if (pluginState.preventHide) {
      pluginState.preventHide = false;

      return;
    }

    if (
      event?.relatedTarget &&
      bubbleMenu.element?.parentNode?.contains(event.relatedTarget as Node)
    ) {
      return;
    }

    bubbleMenu.hide();
  };

  return new Plugin({
    key: options.pluginKey,
    view: (view) => {
      view.dom.addEventListener("mousedown", () => viewMousedownHandler(view));
      view.dom.addEventListener("mouseup", () => viewMouseupHandler(view));
      view.dom.addEventListener("dragstart", dragstartHandler);

      options.editor.on("focus", focusHandler);
      options.editor.on("blur", ({ event }: { event: FocusEvent }) =>
        blurHandler({ event }, view)
      );

      return {
        update: (view, prevState) => {
          const prev = options.pluginKey.getState(prevState);
          const next = options.pluginKey.getState(view.state);

          if (!next.preventShow) {
            if (!prev.show && next.show) {
              bubbleMenu.show(getBubbleMenuProps(options.editor));

              bubbleMenu.element!.addEventListener(
                "mousedown",
                () => mousedownHandler(view),
                {
                  capture: true,
                }
              );
            }

            if (!next.preventUpdate) {
              if (prev.show && next.show) {
                bubbleMenu.update(getBubbleMenuProps(options.editor));
              }
            }
          }

          if (!next.preventHide) {
            if (prev.show && !next.show) {
              bubbleMenu.hide();

              bubbleMenu.element!.removeEventListener(
                "mousedown",
                () => mousedownHandler(view),
                {
                  capture: true,
                }
              );
            }
          }
        },
      };
    },
    state: {
      init: () => {
        return {
          show: false,
          preventShow: false,
          preventUpdate: false,
          preventHide: false,
        };
      },
      apply: (tr, prev, oldState, state) => {
        const next = { ...prev };
        const { doc, selection } = state;

        if (tr.getMeta(options.pluginKey)?.preventShow !== undefined) {
          next.preventShow = tr.getMeta(options.pluginKey).preventShow;
        }

        next.preventUpdate =
          oldState && oldState.doc.eq(doc) && oldState.selection.eq(selection);

        if (tr.getMeta(options.pluginKey)?.preventHide !== undefined) {
          next.preventHide = tr.getMeta(options.pluginKey).preventHide;
        }

        // Support for CellSelections
        const { ranges, empty } = selection;
        const from = Math.min(...ranges.map((range) => range.$from.pos));
        const to = Math.max(...ranges.map((range) => range.$to.pos));

        // Sometime check for `empty` is not enough.
        // Doubleclick an empty paragraph returns a node size of 2.
        // So we check also for an empty text size.
        const isEmptyTextBlock =
          !doc.textBetween(from, to).length && isTextSelection(state.selection);

        if ((empty || isEmptyTextBlock) && !next.preventHide) {
          next.show = false;
          return next;
        }

        if (!next.preventShow) {
          next.show = true;
          return next;
        }

        return next;
      },
    },
  });
};
