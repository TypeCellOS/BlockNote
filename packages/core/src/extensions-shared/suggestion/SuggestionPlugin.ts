import { findParentNode } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { BaseUiElementState } from "../BaseUiElementTypes";
import { SuggestionItem } from "./SuggestionItem";

const findBlock = findParentNode((node) => node.type.name === "blockContainer");

export type SuggestionsMenuState<T extends SuggestionItem> =
  BaseUiElementState & {
    // The suggested items to display.
    filteredItems: T[];
    // The index of the suggested item that's currently hovered by the keyboard.
    keyboardHoveredItemIndex: number;
  };

class SuggestionsMenuView<
  T extends SuggestionItem,
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  private suggestionsMenuState?: SuggestionsMenuState<T>;
  public updateSuggestionsMenu: () => void;

  pluginState: SuggestionPluginState<T>;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    private readonly pluginKey: PluginKey,
    updateSuggestionsMenu: (
      suggestionsMenuState: SuggestionsMenuState<T>
    ) => void = () => {
      // noop
    }
  ) {
    this.pluginState = getDefaultPluginState<T>();

    this.updateSuggestionsMenu = () => {
      if (!this.suggestionsMenuState) {
        throw new Error("Attempting to update uninitialized suggestions menu");
      }

      updateSuggestionsMenu(this.suggestionsMenuState);
    };

    document.addEventListener("scroll", this.handleScroll);
  }

  handleScroll = () => {
    if (this.suggestionsMenuState?.show) {
      const decorationNode = document.querySelector(
        `[data-decoration-id="${this.pluginState.decorationId}"]`
      );
      this.suggestionsMenuState.referencePos =
        decorationNode!.getBoundingClientRect();
      this.updateSuggestionsMenu();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const prev = this.pluginKey.getState(prevState);
    const next = this.pluginKey.getState(view.state);

    // See how the state changed
    const started = !prev.active && next.active;
    const stopped = prev.active && !next.active;
    // TODO: Currently also true for cases in which an update isn't needed so selected list item index updates still
    //  cause the view to update. May need to be more strict.
    const changed = prev.active && next.active;

    // Cancel when suggestion isn't active
    if (!started && !changed && !stopped) {
      return;
    }

    this.pluginState = stopped ? prev : next;

    if (stopped || !this.editor.isEditable) {
      this.suggestionsMenuState!.show = false;
      this.updateSuggestionsMenu();

      return;
    }

    const decorationNode = document.querySelector(
      `[data-decoration-id="${this.pluginState.decorationId}"]`
    );

    if (this.editor.isEditable) {
      this.suggestionsMenuState = {
        show: true,
        referencePos: decorationNode!.getBoundingClientRect(),
        filteredItems: this.pluginState.items,
        keyboardHoveredItemIndex: this.pluginState.keyboardHoveredItemIndex!,
      };

      this.updateSuggestionsMenu();
    }
  }

  destroy() {
    document.removeEventListener("scroll", this.handleScroll);
  }
}

type SuggestionPluginState<T extends SuggestionItem> = {
  // True when the menu is shown, false when hidden.
  active: boolean;
  // The character that triggered the menu being shown. Allowing the trigger to be different to the default
  // trigger allows other extensions to open it programmatically.
  triggerCharacter: string | undefined;
  // The editor position just after the trigger character, i.e. where the user query begins. Used to figure out
  // which menu items to show and can also be used to delete the trigger character.
  queryStartPos: number | undefined;
  // The items that should be shown in the menu.
  items: T[];
  // The index of the item in the menu that's currently hovered using the keyboard.
  keyboardHoveredItemIndex: number | undefined;
  // The number of characters typed after the last query that matched with at least 1 item. Used to close the
  // menu if the user keeps entering queries that don't return any results.
  notFoundCount: number | undefined;
  decorationId: string | undefined;
};

function getDefaultPluginState<
  T extends SuggestionItem
>(): SuggestionPluginState<T> {
  return {
    active: false,
    triggerCharacter: undefined,
    queryStartPos: undefined,
    items: [] as T[],
    keyboardHoveredItemIndex: undefined,
    notFoundCount: 0,
    decorationId: undefined,
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
 */
export const setupSuggestionsMenu = <
  T extends SuggestionItem,
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  updateSuggestionsMenu: (
    suggestionsMenuState: SuggestionsMenuState<T>
  ) => void,

  pluginKey: PluginKey,
  defaultTriggerCharacter: string,
  items: (query: string) => T[] = () => [],
  onSelectItem: (props: {
    item: T;
    editor: BlockNoteEditor<BSchema, I, S>;
  }) => void = () => {
    // noop
  }
) => {
  // Assertions
  if (defaultTriggerCharacter.length !== 1) {
    throw new Error("'char' should be a single character");
  }

  let suggestionsPluginView: SuggestionsMenuView<T, BSchema, I, S>;

  const deactivate = (view: EditorView) => {
    view.dispatch(view.state.tr.setMeta(pluginKey, { deactivate: true }));
  };

  return {
    plugin: new Plugin({
      key: pluginKey,

      view: () => {
        suggestionsPluginView = new SuggestionsMenuView<T, BSchema, I, S>(
          editor,
          pluginKey,

          updateSuggestionsMenu
        );
        return suggestionsPluginView;
      },

      state: {
        // Initialize the plugin's internal state.
        init(): SuggestionPluginState<T> {
          return getDefaultPluginState<T>();
        },

        // Apply changes to the plugin state from an editor transaction.
        apply(transaction, prev, oldState, newState): SuggestionPluginState<T> {
          // TODO: More clearly define which transactions should be ignored.
          if (transaction.getMeta("orderedListIndexing") !== undefined) {
            return prev;
          }

          // Checks if the menu should be shown.
          if (transaction.getMeta(pluginKey)?.activate) {
            return {
              active: true,
              triggerCharacter:
                transaction.getMeta(pluginKey)?.triggerCharacter || "",
              queryStartPos: newState.selection.from,
              items: items(""),
              keyboardHoveredItemIndex: 0,
              // TODO: Maybe should be 1 if the menu has no possible items? Probably redundant since a menu with no items
              //  is useless in practice.
              notFoundCount: 0,
              decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
            };
          }

          // Checks if the menu is hidden, in which case it doesn't need to be hidden or updated.
          if (!prev.active) {
            return prev;
          }

          const next = { ...prev };

          // Updates which menu items to show by checking which items the current query (the text between the trigger
          // character and caret) matches with.
          next.items = items(
            newState.doc.textBetween(
              prev.queryStartPos!,
              newState.selection.from
            )
          );

          // Updates notFoundCount if the query doesn't match any items.
          next.notFoundCount = 0;
          if (next.items.length === 0) {
            // Checks how many characters were typed or deleted since the last transaction, and updates the notFoundCount
            // accordingly. Also ensures the notFoundCount does not become negative.
            next.notFoundCount = Math.max(
              0,
              prev.notFoundCount! +
                (newState.selection.from - oldState.selection.from)
            );
          }

          // Hides the menu. This is done after items and notFoundCount are already updated as notFoundCount is needed to
          // check if the menu should be hidden.
          if (
            // Highlighting text should hide the menu.
            newState.selection.from !== newState.selection.to ||
            // Transactions with plugin metadata {deactivate: true} should hide the menu.
            transaction.getMeta(pluginKey)?.deactivate ||
            // Certain mouse events should hide the menu.
            // TODO: Change to global mousedown listener.
            transaction.getMeta("focus") ||
            transaction.getMeta("blur") ||
            transaction.getMeta("pointer") ||
            // Moving the caret before the character which triggered the menu should hide it.
            (prev.active && newState.selection.from < prev.queryStartPos!) ||
            // Entering more than 3 characters, after the last query that matched with at least 1 menu item, should hide
            // the menu.
            next.notFoundCount > 3
          ) {
            return getDefaultPluginState<T>();
          }

          // Updates keyboardHoveredItemIndex if the up or down arrow key was
          // pressed, or resets it if the keyboard cursor moved.
          if (
            transaction.getMeta(pluginKey)?.selectedItemIndexChanged !==
            undefined
          ) {
            let newIndex =
              transaction.getMeta(pluginKey).selectedItemIndexChanged;

            // Allows selection to jump between first and last items.
            if (newIndex < 0) {
              newIndex = prev.items.length - 1;
            } else if (newIndex >= prev.items.length) {
              newIndex = 0;
            }

            next.keyboardHoveredItemIndex = newIndex;
          } else if (oldState.selection.from !== newState.selection.from) {
            next.keyboardHoveredItemIndex = 0;
          }

          return next;
        },
      },

      props: {
        handleKeyDown(view, event) {
          const menuIsActive = (this as Plugin).getState(view.state).active;

          // Shows the menu if the default trigger character was pressed and the menu isn't active.
          if (event.key === defaultTriggerCharacter && !menuIsActive) {
            view.dispatch(
              view.state.tr
                .insertText(defaultTriggerCharacter)
                .scrollIntoView()
                .setMeta(pluginKey, {
                  activate: true,
                  triggerCharacter: defaultTriggerCharacter,
                })
            );

            return true;
          }

          // Doesn't handle other keystrokes if the menu isn't active.
          if (!menuIsActive) {
            return false;
          }

          // Handles keystrokes for navigating the menu.
          const {
            triggerCharacter,
            queryStartPos,
            items,
            keyboardHoveredItemIndex,
          } = pluginKey.getState(view.state);

          // Moves the keyboard selection to the previous item.
          if (event.key === "ArrowUp") {
            view.dispatch(
              view.state.tr.setMeta(pluginKey, {
                selectedItemIndexChanged: keyboardHoveredItemIndex - 1,
              })
            );
            return true;
          }

          // Moves the keyboard selection to the next item.
          if (event.key === "ArrowDown") {
            view.dispatch(
              view.state.tr.setMeta(pluginKey, {
                selectedItemIndexChanged: keyboardHoveredItemIndex + 1,
              })
            );
            return true;
          }

          // Selects an item and closes the menu.
          if (event.key === "Enter") {
            if (items.length === 0) {
              return true;
            }

            deactivate(view);
            editor._tiptapEditor
              .chain()
              .focus()
              .deleteRange({
                from: queryStartPos! - triggerCharacter!.length,
                to: editor._tiptapEditor.state.selection.from,
              })
              .run();

            onSelectItem({
              item: items[keyboardHoveredItemIndex],
              editor: editor,
            });

            return true;
          }

          // Closes the menu.
          if (event.key === "Escape") {
            deactivate(view);
            return true;
          }

          return false;
        },

        // Setup decorator on the currently active suggestion.
        decorations(state) {
          const { active, decorationId, queryStartPos, triggerCharacter } = (
            this as Plugin
          ).getState(state);

          if (!active) {
            return null;
          }

          // If the menu was opened programmatically by another extension, it may not use a trigger character. In this
          // case, the decoration is set on the whole block instead, as the decoration range would otherwise be empty.
          if (triggerCharacter === "") {
            const blockNode = findBlock(state.selection);
            if (blockNode) {
              return DecorationSet.create(state.doc, [
                Decoration.node(
                  blockNode.pos,
                  blockNode.pos + blockNode.node.nodeSize,
                  {
                    nodeName: "span",
                    class: "bn-suggestion-decorator",
                    "data-decoration-id": decorationId,
                  }
                ),
              ]);
            }
          }
          // Creates an inline decoration around the trigger character.
          return DecorationSet.create(state.doc, [
            Decoration.inline(
              queryStartPos - triggerCharacter.length,
              queryStartPos,
              {
                nodeName: "span",
                class: "bn-suggestion-decorator",
                "data-decoration-id": decorationId,
              }
            ),
          ]);
        },
      },
    }),
    itemCallback: (item: T) => {
      deactivate(editor._tiptapEditor.view);
      editor._tiptapEditor
        .chain()
        .focus()
        .deleteRange({
          from:
            suggestionsPluginView.pluginState.queryStartPos! -
            suggestionsPluginView.pluginState.triggerCharacter!.length,
          to: editor._tiptapEditor.state.selection.from,
        })
        .run();

      onSelectItem({
        item: item,
        editor: editor,
      });
    },
  };
};
