import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { HyperlinkHoverMenuFactory } from "../../menu-tools/HyperlinkHoverMenu/types";
import { getHyperlinkHoverMenuProps } from "../../menu-tools/HyperlinkHoverMenu/getHyperlinkHoverMenuProps";
const PLUGIN_KEY = new PluginKey("HyperlinkMenuPlugin");

export type HyperlinkMenuPluginProps = {
  hyperlinkMenuFactory: HyperlinkHoverMenuFactory;
};

export const createHyperlinkMenuPlugin = (
  editor: Editor,
  options: HyperlinkMenuPluginProps
) => {
  let menuHideTimer: NodeJS.Timeout | undefined;
  const startMenuHideTimer = () => {
    menuHideTimer = setTimeout(() => {
      editor.view.dispatch(
        editor.view.state.tr.setMeta(PLUGIN_KEY, {
          hoveredLinkChanged: true,
        })
      );
    }, 250);
  };
  const stopMenuHideTimer = () => {
    if (menuHideTimer) {
      clearTimeout(menuHideTimer);
      menuHideTimer = undefined;
    }

    return false;
  };

  let mouseHoveredHyperlinkMark: Mark | undefined;
  let mouseHoveredHyperlinkMarkRange: Range | undefined;

  let keyboardHoveredHyperlinkMark: Mark | undefined;
  let keyboardHoveredHyperlinkMarkRange: Range | undefined;

  let hyperlinkMark: Mark | undefined;
  let hyperlinkMarkRange: Range | undefined;

  let hyperlinkMenu = options.hyperlinkMenuFactory(
    getHyperlinkHoverMenuProps(
      "",
      "",
      () => {},
      () => {},
      new DOMRect(),
      editor.options.element
    )
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
                keyboardHoveredHyperlinkMarkRange =
                  getMarkRange(
                    editor.state.selection.$from,
                    mark.type,
                    mark.attrs
                  ) || undefined;
                foundHyperlinkMark = true;

                break;
              }
            }

            if (!foundHyperlinkMark) {
              keyboardHoveredHyperlinkMark = undefined;
              keyboardHoveredHyperlinkMarkRange = undefined;
            }
          }

          const prevHyperlinkMark = hyperlinkMark;

          // Keyboard cursor position overrides mouse cursor position.
          if (mouseHoveredHyperlinkMark) {
            hyperlinkMark = mouseHoveredHyperlinkMark;
            hyperlinkMarkRange = mouseHoveredHyperlinkMarkRange;
          }

          if (keyboardHoveredHyperlinkMark) {
            hyperlinkMark = keyboardHoveredHyperlinkMark;
            hyperlinkMarkRange = keyboardHoveredHyperlinkMarkRange;
          }

          if (!mouseHoveredHyperlinkMark && !keyboardHoveredHyperlinkMark) {
            hyperlinkMark = undefined;
            hyperlinkMarkRange = undefined;
          }

          // Hides menu.
          if (prevHyperlinkMark && !hyperlinkMark) {
            hyperlinkMenu.element?.removeEventListener(
              "mouseleave",
              startMenuHideTimer
            );
            hyperlinkMenu.element?.removeEventListener(
              "mouseenter",
              stopMenuHideTimer
            );

            hyperlinkMenu.hide();

            return;
          }

          if (hyperlinkMark) {
            // Gets all variables/functions needed to render menu.
            const url = hyperlinkMark.attrs.href;
            const text = editor.view.state.doc.textBetween(
              hyperlinkMarkRange!.from,
              hyperlinkMarkRange!.to
            );
            const editHyperlink = (url: string, text: string) => {
              const tr = editor.view.state.tr.insertText(
                text,
                hyperlinkMarkRange!.from,
                hyperlinkMarkRange!.to
              );
              tr.addMark(
                hyperlinkMarkRange!.from,
                hyperlinkMarkRange!.from + text.length,
                editor.schema.mark("link", { href: url })
              );
              editor.view.dispatch(tr);
            };
            const deleteHyperlink = () => {
              editor.view.dispatch(
                editor.view.state.tr
                  .removeMark(
                    hyperlinkMarkRange!.from,
                    hyperlinkMarkRange!.to,
                    hyperlinkMark!.type
                  )
                  .setMeta("preventAutolink", true)
              );
            };
            const hyperlinkBoundingBox = posToDOMRect(
              editor.view,
              hyperlinkMarkRange!.from,
              hyperlinkMarkRange!.to
            );
            const editorElement = editor.view.dom;

            // Shows menu.
            if (!prevHyperlinkMark) {
              hyperlinkMenu.show(
                getHyperlinkHoverMenuProps(
                  url,
                  text,
                  editHyperlink,
                  deleteHyperlink,
                  hyperlinkBoundingBox,
                  editorElement
                )
              );

              hyperlinkMenu.element?.addEventListener(
                "mouseleave",
                startMenuHideTimer
              );
              hyperlinkMenu.element?.addEventListener(
                "mouseenter",
                stopMenuHideTimer
              );

              return;
            }

            // Updates menu.
            hyperlinkMenu.update(
              getHyperlinkHoverMenuProps(
                url,
                text,
                editHyperlink,
                deleteHyperlink,
                hyperlinkBoundingBox,
                editorElement
              )
            );
          }
        },
      };
    },

    props: {
      handleDOMEvents: {
        // Updates view when an anchor (<a>) element is hovered.
        mouseover: (view, event: Event) => {
          console.log(event.target);

          // Checks if target element is an anchor (<a>) element.
          if (
            !(event.target instanceof HTMLAnchorElement) ||
            event.target.nodeName !== "A"
          ) {
            mouseHoveredHyperlinkMark = undefined;
            mouseHoveredHyperlinkMarkRange = undefined;

            return false;
          }

          stopMenuHideTimer();

          // Finds link mark at the hovered element's position to update mouseHoveredHyperlinkMark and
          // mouseHoveredHyperlinkMarkRange.
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
              mouseHoveredHyperlinkMarkRange =
                getMarkRange(
                  resolvedPosInHoveredHyperlinkMark,
                  mark.type,
                  mark.attrs
                ) || undefined;
              foundHyperlinkMark = true;

              break;
            }
          }

          // Resets mouseHoveredHyperlinkMark and mouseHoveredHyperlinkMarkRange if no link mark was found.
          if (!foundHyperlinkMark) {
            mouseHoveredHyperlinkMark = undefined;
            mouseHoveredHyperlinkMarkRange = undefined;

            return false;
          }

          // Dispatches transaction to update the view.
          view.dispatch(
            view.state.tr.setMeta(PLUGIN_KEY, {
              hoveredLinkChanged: true,
            })
          );

          return false;
        },
        // Updates view half a second after the cursor leaves an anchor (<a>) element. This update is cancelled if
        mouseout: (_view, event: Event) => {
          if (
            !(event.target instanceof HTMLAnchorElement) ||
            event.target.nodeName !== "A"
          ) {
            return false;
          }

          startMenuHideTimer();

          return false;
        },
      },
    },
  });
};
