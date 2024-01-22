import { findParentNode } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";
import { BaseUiElementState } from "../BaseUiElementTypes";
// TODO: clean file
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
  public updateSuggestionsMenu: (triggerCharacter: string) => void;

  pluginState: SuggestionPluginState;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    updateSuggestionsMenu: (
      menuName: string,
      suggestionsMenuState: SuggestionsMenuState
    ) => void
  ) {
    this.pluginState = getDefaultPluginState();

    this.updateSuggestionsMenu = (menuName: string) => {
      if (!this.suggestionsMenuState) {
        throw new Error("Attempting to update uninitialized suggestions menu");
      }

      updateSuggestionsMenu(menuName, this.suggestionsMenuState);
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
      this.updateSuggestionsMenu(this.pluginState.triggerCharacter!);
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const prev: SuggestionPluginState =
      suggestionMenuPluginKey.getState(prevState);
    const next: SuggestionPluginState = suggestionMenuPluginKey.getState(
      view.state
    );

    // See how the state changed
    const started =
      prev.triggerCharacter === undefined &&
      next.triggerCharacter !== undefined;
    const stopped =
      prev.triggerCharacter !== undefined &&
      next.triggerCharacter === undefined;
    const changed =
      prev.triggerCharacter !== undefined &&
      next.triggerCharacter !== undefined;

    // Cancel when suggestion isn't active
    if (!started && !changed && !stopped) {
      return;
    }

    this.pluginState = stopped ? prev : next;

    if (stopped || !this.editor.isEditable) {
      this.suggestionsMenuState!.show = false;
      this.updateSuggestionsMenu(this.pluginState.triggerCharacter!);

      return;
    }

    const decorationNode = document.querySelector(
      `[data-decoration-id="${this.pluginState.decorationId}"]`
    );

    if (this.editor.isEditable) {
      this.suggestionsMenuState = {
        show: true,
        referencePos: decorationNode!.getBoundingClientRect(),
        query: this.pluginState.query!,
      };

      this.updateSuggestionsMenu(this.pluginState.triggerCharacter!);
    }
  }

  destroy() {
    document.removeEventListener("scroll", this.handleScroll);
  }
}

// type SuggestionPluginRegisterTransactionMeta = {
//   type: "register";
//   name: string;
//   triggerCharacter: string;
//   getItems: (query: string) => Promise<any[]>;
// };

type SuggestionPluginShowTransactionMeta = {
  type: "show";
  triggerCharacter: string;
};

type SuggestionPluginHideTransactionMeta = {
  type: "hide";
};

type SuggestionPluginTransactionMeta =
  | SuggestionPluginShowTransactionMeta
  | SuggestionPluginHideTransactionMeta;

type SuggestionPluginState =
  | {
      // activeSuggestionMenuName: string | undefined;
      triggerCharacter: string;
      queryStartPos: number;
      query: string;
      decorationId: string;
    }
  // TODO: maybe change to | undefined
  | {
      triggerCharacter: undefined;
      queryStartPos: undefined;
      query: undefined;
      decorationId: undefined;
    };

function getDefaultPluginState(): SuggestionPluginState {
  return {
    // activeSuggestionMenuName: undefined,
    triggerCharacter: undefined,
    queryStartPos: undefined,
    query: undefined,
    decorationId: undefined,
  };
}

export const suggestionMenuPluginKey = new PluginKey("SuggestionMenuPlugin");

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
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  updateSuggestionMenu: (
    menuName: string,
    suggestionMenuState: SuggestionsMenuState
  ) => void
) => {
  let suggestionPluginView: SuggestionMenuView<BSchema, I, S>;
  const triggerCharacters: string[] = [];
  return {
    addTriggerCharacter: (triggerCharacter: string) => {
      triggerCharacters.push(triggerCharacter);
    },
    plugin: new Plugin({
      key: suggestionMenuPluginKey,

      view: () => {
        suggestionPluginView = new SuggestionMenuView<BSchema, I, S>(
          editor,
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

          const suggestionPluginTransactionMeta:
            | SuggestionPluginTransactionMeta
            | undefined =
            typeof transaction.getMeta(suggestionMenuPluginKey) === "object" &&
            "type" in transaction.getMeta(suggestionMenuPluginKey)
              ? transaction.getMeta(suggestionMenuPluginKey)
              : undefined;

          // if (
          //   suggestionPluginTransactionMeta !== undefined &&
          //   suggestionPluginTransactionMeta.type === "register"
          // ) {
          //   const next = { ...prev };
          //   next.suggestionMenus[suggestionPluginTransactionMeta.name] = {
          //     triggerCharacter:
          //       suggestionPluginTransactionMeta.triggerCharacter,
          //     getItems: suggestionPluginTransactionMeta.getItems,
          //   };
          // }

          // Only opens a menu of no menu is already open, i.e. `query` is
          // not defined.
          if (
            suggestionPluginTransactionMeta?.type === "show" &&
            prev.query === undefined
          ) {
            return {
              triggerCharacter:
                suggestionPluginTransactionMeta.triggerCharacter,
              queryStartPos: newState.selection.from,
              query: "",
              decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
            };
          }

          // Checks if the menu is hidden, in which case it doesn't need to be hidden or updated.
          if (prev.triggerCharacter === undefined) {
            return prev;
          }

          // Checks if the menu should be hidden.
          if (
            // Highlighting text should hide the menu.
            newState.selection.from !== newState.selection.to ||
            // Transactions with plugin metadata should hide the menu.
            suggestionPluginTransactionMeta?.type === "hide" ||
            // Certain mouse events should hide the menu.
            // TODO: Change to global mousedown listener.
            transaction.getMeta("focus") ||
            transaction.getMeta("blur") ||
            transaction.getMeta("pointer") ||
            // Moving the caret before the character which triggered the menu should hide it.
            (prev.triggerCharacter !== undefined &&
              newState.selection.from < prev.queryStartPos!)
          ) {
            return {
              triggerCharacter: undefined,
              queryStartPos: undefined,
              query: undefined,
              decorationId: undefined,
            };
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
          const suggestionPluginState: SuggestionPluginState = (
            this as Plugin
          ).getState(view.state);

          if (
            triggerCharacters.includes(event.key) &&
            suggestionPluginState.triggerCharacter === undefined
          ) {
            event.preventDefault();

            const transactionMeta: SuggestionPluginShowTransactionMeta = {
              type: "show",
              triggerCharacter: event.key,
            };

            view.dispatch(
              view.state.tr
                .insertText(event.key)
                .scrollIntoView()
                .setMeta(suggestionMenuPluginKey, transactionMeta)
            );

            return true;
          }

          return false;
          // };

          // for (const [name, info] of Object.entries(
          //   suggestionPluginState.suggestionMenus
          // )) {
          //   keyDownHandler(name, info.triggerCharacter);
          // }
        },

        // Setup decorator on the currently active suggestion.
        decorations(state) {
          const suggestionPluginState: SuggestionPluginState = (
            this as Plugin
          ).getState(state);

          if (suggestionPluginState.triggerCharacter === undefined) {
            return null;
          }

          // If the menu was opened programmatically by another extension, it may not use a trigger character. In this
          // case, the decoration is set on the whole block instead, as the decoration range would otherwise be empty.
          if (suggestionPluginState.triggerCharacter === "") {
            const blockNode = findBlock(state.selection);
            if (blockNode) {
              return DecorationSet.create(state.doc, [
                Decoration.node(
                  blockNode.pos,
                  blockNode.pos + blockNode.node.nodeSize,
                  {
                    nodeName: "span",
                    class: "bn-suggestion-decorator",
                    "data-decoration-id": suggestionPluginState.decorationId,
                  }
                ),
              ]);
            }
          }
          // Creates an inline decoration around the trigger character.
          return DecorationSet.create(state.doc, [
            Decoration.inline(
              suggestionPluginState.queryStartPos! -
                suggestionPluginState.triggerCharacter!.length,
              suggestionPluginState.queryStartPos!,
              {
                nodeName: "span",
                class: "bn-suggestion-decorator",
                "data-decoration-id": suggestionPluginState.decorationId,
              }
            ),
          ]);
        },
      },
    }),
    closeMenu: () => {
      const transactionMeta: SuggestionPluginHideTransactionMeta = {
        type: "hide",
      };
      editor._tiptapEditor.view.dispatch(
        editor._tiptapEditor.view.state.tr.setMeta(
          suggestionMenuPluginKey,
          transactionMeta
        )
      );
    },
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
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  public readonly plugin: Plugin;
  public readonly closeMenu: () => void;
  public readonly clearQuery: () => void;
  private readonly suggestionMenu: ReturnType<typeof setupSuggestionMenu>;

  constructor(editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.suggestionMenu = setupSuggestionMenu<BSchema, I, S>(
      editor,
      (menuName: string, suggestionMenuState) => {
        this.emit(`update ${menuName}`, suggestionMenuState);
      }
    );

    this.plugin = this.suggestionMenu.plugin;
    this.closeMenu = this.suggestionMenu.closeMenu;
    this.clearQuery = this.suggestionMenu.clearQuery;
  }

  public onUpdate(
    triggerCharacter: string,
    callback: (state: SuggestionsMenuState) => void
  ) {
    this.suggestionMenu.addTriggerCharacter(triggerCharacter);
    // TODO: be able to remove the triggerCharacter
    return this.on(`update ${triggerCharacter}`, callback);
  }
}

// export function createSuggestionMenu(
//   tiptapEditor: Editor,
//   name: string,
//   triggerCharacter: string,
//   getItems: (query: string) => Promise<any[]>
// ) {
//   const transactionMeta: SuggestionPluginRegisterTransactionMeta = {
//     type: "register",
//     name: name,
//     triggerCharacter: triggerCharacter,
//     getItems: getItems,
//   };

//   // TODO: needs to be done via state?
//   tiptapEditor.view.dispatch(
//     tiptapEditor.state.tr
//       .insertText(triggerCharacter) // WHY?
//       .scrollIntoView()
//       .setMeta(suggestionMenuPluginKey, transactionMeta)
//   );
// }
