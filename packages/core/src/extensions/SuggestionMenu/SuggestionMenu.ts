import { findParentNode } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import { trackPosition } from "../../api/positionMapping.js";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const findBlock = findParentNode((node) => node.type.name === "blockContainer");

export type SuggestionMenuState = UiElementPosition & {
  query: string;
  ignoreQueryLength?: boolean;
};

class SuggestionMenuView {
  public state?: SuggestionMenuState;
  public emitUpdate: (triggerCharacter: string) => void;
  private rootEl?: Document | ShadowRoot;
  pluginState: SuggestionPluginState;

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    emitUpdate: (menuName: string, state: SuggestionMenuState) => void,
    view: EditorView,
  ) {
    this.pluginState = undefined;

    this.emitUpdate = (menuName: string) => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized suggestions menu");
      }

      emitUpdate(menuName, {
        ...this.state,
        ignoreQueryLength: this.pluginState?.ignoreQueryLength,
      });
    };

    this.rootEl = view.root;

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    this.rootEl?.addEventListener("scroll", this.handleScroll, true);
  }

  handleScroll = () => {
    if (this.state?.show) {
      const decorationNode = this.rootEl?.querySelector(
        `[data-decoration-id="${this.pluginState!.decorationId}"]`,
      );
      if (!decorationNode) {
        return;
      }
      this.state.referencePos = decorationNode
        .getBoundingClientRect()
        .toJSON() as DOMRect;
      this.emitUpdate(this.pluginState!.triggerCharacter!);
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const prev: SuggestionPluginState =
      suggestionMenuPluginKey.getState(prevState);
    const next: SuggestionPluginState = suggestionMenuPluginKey.getState(
      view.state,
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
      if (this.state) {
        this.state.show = false;
      }
      this.emitUpdate(this.pluginState!.triggerCharacter);

      return;
    }

    const decorationNode = this.rootEl?.querySelector(
      `[data-decoration-id="${this.pluginState!.decorationId}"]`,
    );

    if (this.editor.isEditable && decorationNode) {
      this.state = {
        show: true,
        referencePos: decorationNode
          .getBoundingClientRect()
          .toJSON() as DOMRect,
        query: this.pluginState!.query,
      };

      this.emitUpdate(this.pluginState!.triggerCharacter!);
    }
  }

  destroy() {
    this.rootEl?.removeEventListener("scroll", this.handleScroll, true);
  }

  closeMenu = () => {
    this.editor.transact((tr) => tr.setMeta(suggestionMenuPluginKey, null));
  };

  clearQuery = () => {
    if (this.pluginState === undefined) {
      return;
    }

    this.editor._tiptapEditor
      .chain()
      .focus()
      // TODO need to make an API for this
      .deleteRange({
        from:
          this.pluginState.queryStartPos() -
          (this.pluginState.deleteTriggerCharacter
            ? this.pluginState.triggerCharacter!.length
            : 0),
        to: this.editor.transact((tr) => tr.selection.from),
      })
      .run();
  };
}

type SuggestionPluginState =
  | {
      triggerCharacter: string;
      deleteTriggerCharacter: boolean;
      queryStartPos: () => number;
      query: string;
      decorationId: string;
      ignoreQueryLength?: boolean;
    }
  | undefined;

const suggestionMenuPluginKey = new PluginKey("SuggestionMenuPlugin");

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
export const SuggestionMenu = createExtension(({ editor }) => {
  const triggerCharacters: string[] = [];
  let view: SuggestionMenuView | undefined = undefined;
  const store = createStore<
    (SuggestionMenuState & { triggerCharacter: string }) | undefined
  >(undefined);
  return {
    key: "suggestionMenu",
    store,
    addTriggerCharacter: (triggerCharacter: string) => {
      triggerCharacters.push(triggerCharacter);
    },
    removeTriggerCharacter: (triggerCharacter: string) => {
      triggerCharacters.splice(triggerCharacters.indexOf(triggerCharacter), 1);
    },
    closeMenu: () => {
      view?.closeMenu();
    },
    clearQuery: () => {
      view?.clearQuery();
    },
    shown: () => {
      return view?.state?.show || false;
    },
    openSuggestionMenu: (
      triggerCharacter: string,
      pluginState?: {
        deleteTriggerCharacter?: boolean;
        ignoreQueryLength?: boolean;
      },
    ) => {
      if (editor.headless) {
        return;
      }

      editor.focus();

      editor.transact((tr) => {
        if (pluginState?.deleteTriggerCharacter) {
          tr.insertText(triggerCharacter);
        }
        tr.scrollIntoView().setMeta(suggestionMenuPluginKey, {
          triggerCharacter: triggerCharacter,
          deleteTriggerCharacter: pluginState?.deleteTriggerCharacter || false,
          ignoreQueryLength: pluginState?.ignoreQueryLength || false,
        });
      });
    },
    // TODO this whole plugin needs to be refactored (but I've done the minimal)
    prosemirrorPlugins: [
      new Plugin({
        key: suggestionMenuPluginKey,

        view: (v) => {
          view = new SuggestionMenuView(
            editor,
            (triggerCharacter, state) => {
              store.setState({ ...state, triggerCharacter });
            },
            v,
          );
          return view;
        },

        state: {
          // Initialize the plugin's internal state.
          init(): SuggestionPluginState {
            return undefined;
          },

          // Apply changes to the plugin state from an editor transaction.
          apply: (
            transaction,
            prev,
            _oldState,
            newState,
          ): SuggestionPluginState => {
            // Ignore transactions in code blocks.
            if (transaction.selection.$from.parent.type.spec.code) {
              return prev;
            }

            // Either contains the trigger character if the menu should be shown,
            // or null if it should be hidden.
            const suggestionPluginTransactionMeta: {
              triggerCharacter: string;
              deleteTriggerCharacter?: boolean;
              ignoreQueryLength?: boolean;
            } | null = transaction.getMeta(suggestionMenuPluginKey);

            if (
              typeof suggestionPluginTransactionMeta === "object" &&
              suggestionPluginTransactionMeta !== null
            ) {
              if (prev) {
                // Close the previous menu if it exists
                view?.closeMenu();
              }
              const trackedPosition = trackPosition(
                editor,
                newState.selection.from -
                  // Need to account for the trigger char that was inserted, so we offset the position by the length of the trigger character.
                  suggestionPluginTransactionMeta.triggerCharacter.length,
              );
              return {
                triggerCharacter:
                  suggestionPluginTransactionMeta.triggerCharacter,
                deleteTriggerCharacter:
                  suggestionPluginTransactionMeta.deleteTriggerCharacter !==
                  false,
                // When reading the queryStartPos, we offset the result by the length of the trigger character, to make it easy on the caller
                queryStartPos: () =>
                  trackedPosition() +
                  suggestionPluginTransactionMeta.triggerCharacter.length,
                query: "",
                decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
                ignoreQueryLength:
                  suggestionPluginTransactionMeta?.ignoreQueryLength,
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
                newState.selection.from < prev.queryStartPos()) ||
              // Moving the caret to a new block should hide the menu.
              !newState.selection.$from.sameParent(
                newState.doc.resolve(prev.queryStartPos()),
              )
            ) {
              return undefined;
            }

            const next = { ...prev };

            // Updates the current query.
            next.query = newState.doc.textBetween(
              prev.queryStartPos(),
              newState.selection.from,
            );

            return next;
          },
        },

        props: {
          handleTextInput(view, from, to, text) {
            // only on insert
            if (from === to) {
              const doc = view.state.doc;
              for (const str of triggerCharacters) {
                const snippet =
                  str.length > 1
                    ? doc.textBetween(from - str.length, from) + text
                    : text;

                if (str === snippet) {
                  view.dispatch(view.state.tr.insertText(text));
                  view.dispatch(
                    view.state.tr
                      .setMeta(suggestionMenuPluginKey, {
                        triggerCharacter: snippet,
                      })
                      .scrollIntoView(),
                  );
                  return true;
                }
              }
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
            if (!suggestionPluginState.deleteTriggerCharacter) {
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
                    },
                  ),
                ]);
              }
            }
            // Creates an inline decoration around the trigger character.
            return DecorationSet.create(state.doc, [
              Decoration.inline(
                suggestionPluginState.queryStartPos() -
                  suggestionPluginState.triggerCharacter!.length,
                suggestionPluginState.queryStartPos(),
                {
                  nodeName: "span",
                  class: "bn-suggestion-decorator",
                  "data-decoration-id": suggestionPluginState.decorationId,
                },
              ),
            ]);
          },
        },
      }),
    ],
  } as const;
});
