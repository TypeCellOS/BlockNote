import { findParentNode } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { BaseUiElementState } from "../BaseUiElementTypes";
import { SuggestionItem } from "./SuggestionItem";
import { EventEmitter } from "../../util/EventEmitter";

const findBlock = findParentNode((node) => node.type.name === "blockContainer");

export type SuggestionsMenuState = BaseUiElementState & {
  query: string;
};

class SuggestionMenuView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  private suggestionsMenuState?: SuggestionsMenuState;
  public updateSuggestionsMenu: () => void;

  pluginState: SuggestionPluginState;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    private readonly pluginKey: PluginKey,
    updateSuggestionsMenu: (
      suggestionsMenuState: SuggestionsMenuState
    ) => void = () => {
      // noop
    }
  ) {
    this.pluginState = getDefaultPluginState();

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
        query: this.pluginState.query,
      };

      this.updateSuggestionsMenu();
    }
  }

  destroy() {
    document.removeEventListener("scroll", this.handleScroll);
  }
}

type SuggestionPluginState = {
  // True when the menu is shown, false when hidden.
  active: boolean;
  // The character that triggered the menu being shown. Allowing the trigger to be different to the default
  // trigger allows other extensions to open it programmatically.
  triggerCharacter: string | undefined;
  // The editor position just after the trigger character, i.e. where the user query begins. Used to figure out
  // which menu items to show and can also be used to delete the trigger character.
  queryStartPos: number | undefined;
  query: string;
  decorationId: string | undefined;
};

function getDefaultPluginState(): SuggestionPluginState {
  return {
    active: false,
    triggerCharacter: undefined,
    queryStartPos: undefined,
    query: "",
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
export const setupSuggestionMenu = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  T extends SuggestionItem<BSchema, I, S>
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  updateSuggestionMenu: (suggestionMenuState: SuggestionsMenuState) => void,

  pluginKey: PluginKey,
  defaultTriggerCharacter: string,
  getItems: (query: string) => Promise<T[]> = () =>
    new Promise((resolve) => resolve([])),
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

  let suggestionPluginView: SuggestionMenuView<BSchema, I, S>;

  const deactivate = (view: EditorView) => {
    view.dispatch(view.state.tr.setMeta(pluginKey, { deactivate: true }));
  };

  return {
    plugin: new Plugin({
      key: pluginKey,

      view: () => {
        suggestionPluginView = new SuggestionMenuView<BSchema, I, S>(
          editor,
          pluginKey,

          updateSuggestionMenu
        );
        return suggestionPluginView;
      },

      state: {
        // Initialize the plugin's internal state.
        init(): SuggestionPluginState {
          return getDefaultPluginState();
        },

        // Apply changes to the plugin state from an editor transaction.
        apply(transaction, prev, _oldState, newState): SuggestionPluginState {
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
              query: "",
              decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
            };
          }

          // Checks if the menu is hidden, in which case it doesn't need to be hidden or updated.
          if (!prev.active) {
            return prev;
          }

          // Checks if the menu should be hidden.
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
            (prev.active && newState.selection.from < prev.queryStartPos!)
          ) {
            return getDefaultPluginState();
          }

          const next = { ...prev };

          // Updates the current query.
          next.query = newState.doc.textBetween(
            prev.queryStartPos!,
            newState.selection.from
          );

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
    getItems: getItems,
    executeItem: (item: T) => {
      onSelectItem({ item, editor });
    },
    closeMenu: () => deactivate(editor._tiptapEditor.view),
    clearQuery: () =>
      editor._tiptapEditor
        .chain()
        .focus()
        .deleteRange({
          from:
            suggestionPluginView.pluginState.queryStartPos! -
            suggestionPluginView.pluginState.triggerCharacter!.length,
          to: editor._tiptapEditor.state.selection.from,
        })
        .run(),
  };
};

export class SuggestionMenuProseMirrorPlugin<
  Item extends SuggestionItem<BSchema, I, S>,
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  public readonly plugin: Plugin;
  public readonly getItems: (query: string) => Promise<Item[]>;
  public readonly executeItem: (item: Item) => void;
  public readonly closeMenu: () => void;
  public readonly clearQuery: () => void;

  constructor(
    editor: BlockNoteEditor<BSchema, I, S>,
    name: string,
    triggerCharacter: string,
    getItems: (query: string) => Promise<Item[]>
  ) {
    if (triggerCharacter.length !== 1) {
      throw new Error(
        `The trigger character must be a single character, but received ${triggerCharacter}`
      );
    }

    super();
    const suggestionMenu = setupSuggestionMenu<BSchema, I, S, Item>(
      editor,
      (state) => {
        this.emit("update", state);
      },
      new PluginKey(name),
      triggerCharacter,
      getItems,
      ({ item, editor }) => item.execute(editor)
    );

    this.plugin = suggestionMenu.plugin;
    this.getItems = getItems;
    this.executeItem = suggestionMenu.executeItem;
    this.closeMenu = suggestionMenu.closeMenu;
    this.clearQuery = suggestionMenu.clearQuery;
  }

  public onUpdate(callback: (state: SuggestionsMenuState) => void) {
    return this.on("update", callback);
  }
}

export function createSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  SuggestionMenuItem extends SuggestionItem<BSchema, I, S>
>(
  name: string,
  triggerCharacter: string,
  getItems: (query: string) => Promise<SuggestionMenuItem[]>
) {
  return (editor: BlockNoteEditor<BSchema, I, S>) =>
    new SuggestionMenuProseMirrorPlugin(
      editor,
      name,
      triggerCharacter,
      getItems
    );
}
