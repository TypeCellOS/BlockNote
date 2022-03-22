import { Editor, Range } from "@tiptap/core";
import { escapeRegExp, groupBy } from "lodash";
import { Plugin, PluginKey, Selection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { findBlock } from "../../../extensions/Blocks/helpers/findBlock";
import SuggestionItem from "./SuggestionItem";

import createRenderer, {
  SuggestionRendererProps,
} from "./SuggestionListReactRenderer";

export type SuggestionPluginOptions<T extends SuggestionItem> = {
  /**
   * The name of the plugin.
   *
   * Used for ensuring that the plugin key is unique when more than one instance of the SuggestionPlugin is used.
   */
  pluginKey: PluginKey;

  /**
   * The TipTap editor.
   */
  editor: Editor;

  /**
   * The character that should trigger the suggestion menu to pop up (e.g. a '/' for commands)
   */
  char: string;

  /**
   * The callback that gets executed when an item is selected by the user.
   *
   * **NOTE:** The command text is not removed automatically from the editor by this plugin,
   * this should be done manually. The `editor` and `range` properties passed
   * to the callback function might come in handy when doing this.
   */
  onSelectItem?: (props: { item: T; editor: Editor; range: Range }) => void;

  /**
   * A function that should supply the plugin with items to suggest, based on a certain query string.
   */
  items?: (query: string) => T[];

  allow?: (props: { editor: Editor; range: Range }) => boolean;
};

export type MenuType = "slash" | "drag";

/**
 * Finds a command: a specified character (e.g. '/') followed by a string of characters (all characters except the specified character are allowed).
 * Returns the string following the specified character or undefined if no command was found.
 *
 * @param char the character that indicates the start of a command
 * @param selection the selection (only works if the selection is empty; i.e. is a blinking cursor).
 * @returns an object containing the matching word (excluding the specified character) and the range of the match (including the specified character) or undefined if there is no match.
 */
export function findCommandBeforeCursor(
  char: string,
  selection: Selection<any>
): { range: Range; query: string } | undefined {
  if (!selection.empty) {
    return undefined;
  }

  // get the text before the cursor as a node
  const node = selection.$anchor.nodeBefore;
  if (!node || !node.text) {
    return undefined;
  }

  // regex to match anything between with the specified char (e.g. '/') and the end of text (which is the end of selection)
  const regex = new RegExp(`${escapeRegExp(char)}([^${escapeRegExp(char)}]*)$`);
  const match = node.text.match(regex);

  if (!match) {
    return undefined;
  }

  return {
    query: match[1],
    range: {
      from: selection.$anchor.pos - match[1].length - char.length,
      to: selection.$anchor.pos,
    },
  };
}

/**
 * A ProseMirror plugin for suggestions, designed to make '/'-commands possible as well as mentions.
 *
 * This is basically a simplified version of TipTap's [Suggestions](https://github.com/ueberdosis/tiptap/tree/db92a9b313c5993b723c85cd30256f1d4a0b65e1/packages/suggestion) plugin.
 *
 * This version is adapted from the aforementioned version in the following ways:
 * - This version supports generic items instead of only strings (to allow for more advanced filtering for example)
 * - This version hides some unnecessary complexity from the user of the plugin.
 * - This version handles key events differently
 *
 * @param options options for configuring the plugin
 * @returns the prosemirror plugin
 */
export function createSuggestionPlugin<T extends SuggestionItem>({
  pluginKey,
  editor,
  char,
  onSelectItem: selectItemCallback = () => {},
  items = () => [],
}: SuggestionPluginOptions<T>) {
  // Assertions
  if (char.length !== 1) {
    throw new Error("'char' should be a single character");
  }

  const renderer = createRenderer<T>(editor);

  // Plugin key is passed in parameter so it can be exported and used in draghandle
  return new Plugin({
    key: pluginKey,

    filterTransaction(transaction) {
      // prevent blurring when clicking with the mouse inside the popup menu
      const blurMeta = transaction.getMeta("blur");
      if (blurMeta?.event.relatedTarget) {
        const c = renderer.getComponent();
        if (c?.contains(blurMeta.event.relatedTarget)) {
          return false;
        }
      }
      return true;
    },

    view() {
      return {
        update: async (view, prevState) => {
          const prev = this.key?.getState(prevState);
          const next = this.key?.getState(view.state);

          // See how the state changed
          const started = !prev.active && next.active;
          const stopped = prev.active && !next.active;
          const changed = !started && !stopped && prev.query !== next.query;

          // Cancel when suggestion isn't active
          if (!started && !changed && !stopped) {
            return;
          }

          const state = stopped ? prev : next;
          const decorationNode = document.querySelector(
            `[data-decoration-id="${state.decorationId}"]`
          );

          const groups: { [groupName: string]: T[] } = groupBy(
            state.items,
            "groupName"
          );

          const deactivate = () => {
            view.dispatch(
              view.state.tr.setMeta(pluginKey, { deactivate: true })
            );
          };

          const rendererProps: SuggestionRendererProps<T> = {
            groups: changed || started ? groups : {},
            count: state.items.length,
            onSelectItem: (item: T) => {
              deactivate();
              selectItemCallback({
                item,
                editor,
                range: state.range,
              });
            },
            // virtual node for popper.js or tippy.js
            // this can be used for building popups without a DOM node
            clientRect: decorationNode
              ? () => decorationNode.getBoundingClientRect()
              : null,
            onClose: () => {
              deactivate();
              renderer.onExit?.(rendererProps);
            },
          };

          if (stopped) {
            renderer.onExit?.(rendererProps);
          }

          if (changed) {
            renderer.onUpdate?.(rendererProps);
          }

          if (started) {
            renderer.onStart?.(rendererProps);
          }
        },
      };
    },

    state: {
      // Initialize the plugin's internal state.
      init() {
        return {
          active: false,
          range: {},
          query: null,
          notFoundCount: 0,
          items: [],
          type: "slash",
        };
      },

      // Apply changes to the plugin state from a view transaction.
      apply(transaction, prev, _oldState, _newState) {
        const { selection } = transaction;
        const next = { ...prev };

        if (
          // only show popup if selection is a blinking cursor
          selection.from === selection.to &&
          // deactivate popup from view (e.g.: choice has been made or esc has been pressed)
          !transaction.getMeta(pluginKey)?.deactivate &&
          // deactivate because a mouse event occurs (user clicks somewhere else in the document)
          !transaction.getMeta("focus") &&
          !transaction.getMeta("blur") &&
          !transaction.getMeta("pointer")
        ) {
          // Reset active state if we just left the previous suggestion range (e.g.: key arrows moving before /)
          if (prev.active && selection.from <= prev.range.from) {
            next.active = false;
          } else if (transaction.getMeta(pluginKey)?.activate) {
            // Start showing suggestions. activate has been set after typing a "/" (or whatever the specified character is), so let's create the decoration and initialize
            const newDecorationId = `id_${Math.floor(
              Math.random() * 0xffffffff
            )}`;
            next.decorationId = newDecorationId;
            next.range = {
              from: selection.from - 1,
              to: selection.to,
            };
            next.query = "";
            next.active = true;
            next.type = transaction.getMeta(pluginKey)?.type;
          } else if (prev.active) {
            // Try to match against where our cursor currently is
            // if the type is slash we get the command after the character
            // otherwise we get the whole query
            const match = findCommandBeforeCursor(
              prev.type === "slash" ? char : "",
              selection
            );
            if (!match) {
              throw new Error("active but no match (suggestions)");
            }

            next.range = match.range;
            next.active = true;
            next.decorationId = prev.decorationId;
            next.query = match.query;
          }
        } else {
          next.active = false;
        }

        if (next.active) {
          next.items = items(next.query);
          if (next.items.length) {
            next.notFoundCount = 0;
          } else {
            // Update the "notFoundCount",
            // which indicates how many characters have been typed after showing no results
            if (next.range.to > prev.range.to) {
              // Text has been entered (selection moved to right), but still no items found, update Count
              next.notFoundCount = prev.notFoundCount + 1;
            } else {
              // No text has been entered in this tr, keep not found count
              // (e.g.: user hits backspace after no results)
              next.notFoundCount = prev.notFoundCount;
            }
          }

          if (next.notFoundCount > 3) {
            next.active = false;
          }
        }

        // Make sure to empty the range if suggestion is inactive
        if (!next.active) {
          next.decorationId = null;
          next.range = {};
          next.query = null;
          next.notFoundCount = 0;
          next.items = [];
        }

        return next;
      },
    },

    props: {
      handleKeyDown(view, event) {
        const { active } = this.getState(view.state);

        if (!active) {
          // activate the popup on 'char' keypress (e.g. '/')
          if (event.key === char) {
            view.dispatch(
              view.state.tr
                .insertText(char)
                .scrollIntoView()
                .setMeta(pluginKey, { activate: true, type: "slash" })
            );
            // return true to cancel the original event, as we insert / ourselves
            return true;
          }
          return false;
        }

        // pass the key event onto the renderer (to handle arrow keys, enter and escape)
        // return true if the event got handled by the renderer or false otherwise
        return renderer.onKeyDown?.(event) || false;
      },

      // Setup decorator on the currently active suggestion.
      decorations(state) {
        const { active, range, decorationId, type } = this.getState(state);

        if (!active) {
          return null;
        }

        // If type in meta is drag, create decoration node that wraps block
        // Because the block does not have content yet (slash menu has the '/' in its content),
        // so we can't use an inline decoration.
        if (type === "drag") {
          const blockNode = findBlock(state.selection);
          if (blockNode) {
            return DecorationSet.create(state.doc, [
              Decoration.node(
                blockNode.pos,
                blockNode.pos + blockNode.node.nodeSize,
                {
                  nodeName: "span",
                  class: "suggestion-decorator",
                  "data-decoration-id": decorationId,
                }
              ),
            ]);
          }
        }
        // Create inline decoration that wraps / or whatever the specified character is
        return DecorationSet.create(state.doc, [
          Decoration.inline(range.from, range.to, {
            nodeName: "span",
            class: "suggestion-decorator",
            "data-decoration-id": decorationId,
          }),
        ]);
      },
    },
  });
}
