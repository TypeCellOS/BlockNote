import { Editor } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { HyperlinkHoverMenuFactory } from "../../menu-tools/HyperlinkHoverMenu/types";
import { getHyperlinkHoverMenuFactoryFunctions } from "../../menu-tools/HyperlinkHoverMenu/getHyperlinkHoverMenuFactoryFunctions";
const PLUGIN_KEY = new PluginKey("HyperlinkMenuPlugin");

export type HyperlinkMenuPluginProps = {
  hyperlinkMenuFactory: HyperlinkHoverMenuFactory;
};

export const createHyperlinkMenuPlugin = (
  editor: Editor,
  options: HyperlinkMenuPluginProps
) => {
  let mouseHoveredHyperlinkMark: Mark | undefined;
  let keyboardHoveredHyperlinkMark: Mark | undefined;
  let hyperlinkMark: Mark | undefined;

  const hyperlinkMenuFactory = options.hyperlinkMenuFactory;
  let hyperlinkMenu = hyperlinkMenuFactory(
    getHyperlinkHoverMenuFactoryFunctions(editor)
  );

  return new Plugin({
    key: PLUGIN_KEY,
    view() {
      return {
        update: async (_view, _prevState) => {
          if (editor.state.selection.empty) {
            const marksAtPos = editor.state.selection.$from.marks();

            let foundHyperlinkMark = false;

            for (const mark of marksAtPos) {
              if (mark.type.name === editor.schema.mark("link").type.name) {
                keyboardHoveredHyperlinkMark = mark;
                foundHyperlinkMark = true;

                break;
              }
            }

            if (!foundHyperlinkMark) {
              keyboardHoveredHyperlinkMark = undefined;
            }
          }

          if (keyboardHoveredHyperlinkMark) {
            hyperlinkMark = keyboardHoveredHyperlinkMark;
          }

          if (mouseHoveredHyperlinkMark) {
            hyperlinkMark = mouseHoveredHyperlinkMark;
          }

          if (!mouseHoveredHyperlinkMark && !keyboardHoveredHyperlinkMark) {
            hyperlinkMark = undefined;
          }

          if (!hyperlinkMark) {
            hyperlinkMenu.hide();
          } else {
            hyperlinkMenu.update();
            hyperlinkMenu.show();
          }
        },
      };
    },

    props: {
      handleDOMEvents: {
        // update view when an <a> is hovered over
        mouseover(view, event: any) {
          if (
            event.target instanceof HTMLAnchorElement &&
            event.target.nodeName === "A"
          ) {
            const hoveredHyperlinkElement = event.target;
            const posInHoveredHyperlinkMark =
              editor.view.posAtDOM(hoveredHyperlinkElement, 0) + 1;
            const resolvedPosInHoveredHyperlinkMark = editor.state.doc.resolve(
              posInHoveredHyperlinkMark
            );
            const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

            let foundHyperlinkMark = false;

            for (const mark of marksAtPos) {
              if (mark.type.name === editor.schema.mark("link").type.name) {
                mouseHoveredHyperlinkMark = mark;
                foundHyperlinkMark = true;

                break;
              }
            }

            if (!foundHyperlinkMark) {
              mouseHoveredHyperlinkMark = undefined;
            }
          } else {
            mouseHoveredHyperlinkMark = undefined;
          }

          // Using setTimeout ensures all other listeners of this event are executed before a new transaction is
          // dispatched.
          setTimeout(() => {
            view.dispatch(
              view.state.tr.setMeta(PLUGIN_KEY, {
                hoveredLinkChanged: true,
              })
            );
          });

          return false;
        },
      },
    },
  });
};
