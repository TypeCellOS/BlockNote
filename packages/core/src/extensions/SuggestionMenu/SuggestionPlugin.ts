import { findParentNode } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { EventEmitter } from "../../util/EventEmitter";

const findBlock = findParentNode((node) => node.type.name === "blockContainer");

export type SuggestionMenuState = UiElementPosition & {
  query: string;
};

class SuggestionMenuView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  private state?: SuggestionMenuState;
  public emitUpdate: (triggerCharacter: string) => void;

  pluginState: SuggestionPluginState;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    emitUpdate: (menuName: string, state: SuggestionMenuState) => void
  ) {
    this.pluginState = undefined;

    this.emitUpdate = (menuName: string) => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized suggestions menu");
      }

      emitUpdate(menuName, this.state);
    };

    document.addEventListener("scroll", this.handleScroll);
  }

  handleScroll = () => {
    if (this.state?.show) {
      const decorationNode = document.querySelector(
        `[data-decoration-id="${this.pluginState!.decorationId}"]`
      );
      this.state.referencePos = decorationNode!.getBoundingClientRect();
      this.emitUpdate(this.pluginState!.triggerCharacter!);
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const prev: SuggestionPluginState =
      suggestionMenuPluginKey.getState(prevState);
    const next: SuggestionPluginState = suggestionMenuPluginKey.getState(
      view.state
    );

    // See how the state changed
    const started = prev === undefined && next !== undefined;
    const stopped = prev !== undefined && next === undefined;
    const changed = prev !== undefined && next !== undefined;

    // Cancel when suggestion isn't active
    if (!started && !changed && !stopped) {
      return;
    }

    this.pluginState = stopped ? prev : next;

    if (stopped || !this.editor.isEditable) {
      this.state!.show = false;
      this.emitUpdate(this.pluginState!.triggerCharacter);

      return;
    }

    const decorationNode = document.querySelector(
      `[data-decoration-id="${this.pluginState!.decorationId}"]`
    );

    if (this.editor.isEditable) {
      this.state = {
        show: true,
        referencePos: decorationNode!.getBoundingClientRect(),
        query: this.pluginState!.query,
      };

      this.emitUpdate(this.pluginState!.triggerCharacter!);
    }
  }

  destroy() {
    document.removeEventListener("scroll", this.handleScroll);
  }

  closeMenu = () => {
    this.editor._tiptapEditor.view.dispatch(
      this.editor._tiptapEditor.view.state.tr.setMeta(
        suggestionMenuPluginKey,
        null
      )
    );
  };

  clearQuery = () => {
    if (this.pluginState === undefined) {
      return;
    }

    this.editor._tiptapEditor
      .chain()
      .focus()
      .deleteRange({
        from:
          this.pluginState.queryStartPos! -
          (this.pluginState.fromUserInput
            ? this.pluginState.triggerCharacter!.length
            : 0),
        to: this.editor._tiptapEditor.state.selection.from,
      })
      .run();
  };
}

type SuggestionPluginState =
  | {
      triggerCharacter: string;
      fromUserInput: boolean;
      queryStartPos: number;
      query: string;
      decorationId: string;
    }
  | undefined;

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
export class SuggestionMenuProseMirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: SuggestionMenuView<BSchema, I, S> | undefined;
  public readonly plugin: Plugin;

  private triggerCharacters: string[] = [];

  constructor(editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    const triggerCharacters = this.triggerCharacters;
    this.plugin = new Plugin({
      key: suggestionMenuPluginKey,

      view: () => {
        this.view = new SuggestionMenuView<BSchema, I, S>(
          editor,
          (triggerCharacter, state) => {
            this.emit(`update ${triggerCharacter}`, state);
          }
        );
        return this.view;
      },

      state: {
        // Initialize the plugin's internal state.
        init(): SuggestionPluginState {
          return undefined;
        },

        // Apply changes to the plugin state from an editor transaction.
        apply(transaction, prev, _oldState, newState): SuggestionPluginState {
          // TODO: More clearly define which transactions should be ignored.
          if (transaction.getMeta("orderedListIndexing") !== undefined) {
            return prev;
          }

          // Either contains the trigger character if the menu should be shown,
          // or null if it should be hidden.
          const suggestionPluginTransactionMeta: {
            triggerCharacter: string;
            fromUserInput?: boolean;
          } | null = transaction.getMeta(suggestionMenuPluginKey);

          // Only opens a menu of no menu is already open
          if (
            typeof suggestionPluginTransactionMeta === "object" &&
            suggestionPluginTransactionMeta !== null &&
            prev === undefined
          ) {
            return {
              triggerCharacter:
                suggestionPluginTransactionMeta.triggerCharacter,
              fromUserInput:
                suggestionPluginTransactionMeta.fromUserInput !== false,
              queryStartPos: newState.selection.from,
              query: "",
              decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
            };
          }

          // Checks if the menu is hidden, in which case it doesn't need to be hidden or updated.
          if (prev === undefined) {
            return prev;
          }

          // Checks if the menu should be hidden.
          if (
            // Highlighting text should hide the menu.
            newState.selection.from !== newState.selection.to ||
            // Transactions with plugin metadata should hide the menu.
            suggestionPluginTransactionMeta === null ||
            // Certain mouse events should hide the menu.
            // TODO: Change to global mousedown listener.
            transaction.getMeta("focus") ||
            transaction.getMeta("blur") ||
            transaction.getMeta("pointer") ||
            // Moving the caret before the character which triggered the menu should hide it.
            (prev.triggerCharacter !== undefined &&
              newState.selection.from < prev.queryStartPos!)
          ) {
            return undefined;
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
        handleTextInput(view, _from, _to, text) {
          const suggestionPluginState: SuggestionPluginState = (
            this as Plugin
          ).getState(view.state);

          if (
            triggerCharacters.includes(text) &&
            suggestionPluginState === undefined
          ) {
            view.dispatch(
              view.state.tr
                .insertText(text)
                .scrollIntoView()
                .setMeta(suggestionMenuPluginKey, {
                  triggerCharacter: text,
                })
            );

            return true;
          }
          return false;
        },

        // Setup decorator on the currently active suggestion.
        decorations(state) {
          const suggestionPluginState: SuggestionPluginState = (
            this as Plugin
          ).getState(state);

          if (suggestionPluginState === undefined) {
            return null;
          }

          // If the menu was opened programmatically by another extension, it may not use a trigger character. In this
          // case, the decoration is set on the whole block instead, as the decoration range would otherwise be empty.
          if (!suggestionPluginState.fromUserInput) {
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
    });
  }

  public onUpdate(
    triggerCharacter: string,
    callback: (state: SuggestionMenuState) => void
  ) {
    if (!this.triggerCharacters.includes(triggerCharacter)) {
      this.addTriggerCharacter(triggerCharacter);
    }
    // TODO: be able to remove the triggerCharacter
    return this.on(`update ${triggerCharacter}`, callback);
  }

  addTriggerCharacter = (triggerCharacter: string) => {
    this.triggerCharacters.push(triggerCharacter);
  };

  // TODO: Should this be called automatically when listeners are removed?
  removeTriggerCharacter = (triggerCharacter: string) => {
    this.triggerCharacters = this.triggerCharacters.filter(
      (c) => c !== triggerCharacter
    );
  };

  closeMenu = () => this.view!.closeMenu();

  clearQuery = () => this.view!.clearQuery();
}

export function createSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>, triggerCharacter: string) {
  editor.suggestionMenus.addTriggerCharacter(triggerCharacter);
}
