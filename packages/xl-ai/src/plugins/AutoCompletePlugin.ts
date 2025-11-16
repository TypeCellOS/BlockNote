import {
  BlockNoteEditor,
  BlockNoteExtension,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type AutoCompleteState =
  | {
      autoCompleteSuggestion: AutoCompleteSuggestion;
    }
  | undefined;

// class AutoCompleteView<
//   BSchema extends BlockSchema,
//   I extends InlineContentSchema,
//   S extends StyleSchema,
// > implements PluginView
// {
//   public state?: AutoCompleteState;

//   private rootEl?: Document | ShadowRoot;
//   //   pluginState: AutoCompleteState;

//   constructor(
//     private readonly editor: BlockNoteEditor<BSchema, I, S>,
//     public readonly view: EditorView,
//   ) {
//     // this.pluginState = undefined;
//   }
// }

const autoCompletePluginKey = new PluginKey<{ isUserInput: boolean }>(
  "AutoCompletePlugin",
);

type AutoCompleteSuggestion = {
  position: number;
  suggestion: string;
};

async function fetchAutoCompleteSuggestions(
  state: EditorState,
  _signal: AbortSignal,
) {
  // TODO: options to get block json until selection
  const text = state.doc.textBetween(
    state.selection.from - 300,
    state.selection.from,
  );

  const response = await fetch(
    `https://localhost:3000/ai/autocomplete/generateText`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
  );
  const data = await response.json();
  return data.suggestions.map((suggestion: string) => ({
    position: state.selection.from,
    suggestion: suggestion,
  }));
  //   return [
  //     {
  //       position: state.selection.from,
  //       suggestion: "Hello World",
  //     },
  //     {
  //       position: state.selection.from,
  //       suggestion: "Hello Planet",
  //     },
  //   ];
}

function getMatchingSuggestions(
  autoCompleteSuggestions: AutoCompleteSuggestion[],
  state: EditorState,
): AutoCompleteSuggestion[] {
  return autoCompleteSuggestions
    .map((suggestion) => {
      if (suggestion.position > state.selection.from) {
        return false;
      }

      if (
        !state.doc
          .resolve(suggestion.position)
          .sameParent(state.selection.$from)
      ) {
        return false;
      }

      const text = state.doc.textBetween(
        suggestion.position,
        state.selection.from,
      );
      if (
        suggestion.suggestion.startsWith(text) &&
        suggestion.suggestion.length > text.length
      ) {
        return {
          position: suggestion.position,
          suggestion: suggestion.suggestion.slice(text.length),
        };
      }
      return false;
    })
    .filter((suggestion) => suggestion !== false);
}

export class AutoCompleteProseMirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends BlockNoteExtension {
  public static key() {
    return "suggestionMenu";
  }

  public get priority(): number | undefined {
    return 1000000; // should be lower (e.g.: -1000 to be below suggestion menu, but that currently breaks Tab)
  }

  //   private view: AutoCompleteView<BSchema, I, S> | undefined;

  //   private view: EditorView | undefined;
  private autoCompleteSuggestions: AutoCompleteSuggestion[] = [];

  private debounceFetchSuggestions = debounceWithAbort(
    async (state: EditorState, signal: AbortSignal) => {
      // fetch suggestions
      const autoCompleteSuggestions = await fetchAutoCompleteSuggestions(
        state,
        signal,
      );

      // TODO: map positions?

      if (signal.aborted) {
        return;
      }

      this.autoCompleteSuggestions = autoCompleteSuggestions;
      this.editor.transact((tr) => {
        tr.setMeta(autoCompletePluginKey, {
          autoCompleteSuggestions,
        });
      });
    },
  );

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    _options: any,
  ) {
    super();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.addProsemirrorPlugin(
      new Plugin({
        key: autoCompletePluginKey,

        // view: (view) => {
        //   this.view = new AutoCompleteView<BSchema, I, S>(editor, view);
        //   return this.view;
        // },

        state: {
          // Initialize the plugin's internal state.
          init(): AutoCompleteState {
            return undefined;
          },

          // Apply changes to the plugin state from an editor transaction.
          apply: (
            transaction,
            _prev,
            _oldState,
            newState,
          ): AutoCompleteState => {
            // selection is active, no autocomplete
            if (newState.selection.from !== newState.selection.to) {
              this.debounceFetchSuggestions.cancel();
              return undefined;
            }

            // Are there matching suggestions?
            const matchingSuggestions = getMatchingSuggestions(
              this.autoCompleteSuggestions,
              newState,
            );

            if (matchingSuggestions.length > 0) {
              this.debounceFetchSuggestions.cancel();
              return {
                autoCompleteSuggestion: matchingSuggestions[0],
              };
            }

            // No matching suggestions, if isUserInput is true, debounce fetch suggestions
            if (transaction.getMeta(autoCompletePluginKey)?.isUserInput) {
              this.debounceFetchSuggestions(newState).catch((error) => {
                /* eslint-disable-next-line no-console */
                console.error(error);
              });
            } else {
              // clear suggestions
              this.autoCompleteSuggestions = [];
            }
            return undefined;

            // Ignore transactions in code blocks.
            // if (transaction.selection.$from.parent.type.spec.code) {
            //   return prev;
            // }

            // // Either contains the trigger character if the menu should be shown,
            // // or null if it should be hidden.
            // const suggestionPluginTransactionMeta: {
            //   triggerCharacter: string;
            //   deleteTriggerCharacter?: boolean;
            //   ignoreQueryLength?: boolean;
            // } | null = transaction.getMeta(autoCompletePluginKey);

            // if (
            //   typeof suggestionPluginTransactionMeta === "object" &&
            //   suggestionPluginTransactionMeta !== null
            // ) {
            //   if (prev) {
            //     // Close the previous menu if it exists
            //     this.closeMenu();
            //   }
            //   const trackedPosition = trackPosition(
            //     editor,
            //     newState.selection.from -
            //       // Need to account for the trigger char that was inserted, so we offset the position by the length of the trigger character.
            //       suggestionPluginTransactionMeta.triggerCharacter.length,
            //   );
            //   return {
            //     triggerCharacter:
            //       suggestionPluginTransactionMeta.triggerCharacter,
            //     deleteTriggerCharacter:
            //       suggestionPluginTransactionMeta.deleteTriggerCharacter !==
            //       false,
            //     // When reading the queryStartPos, we offset the result by the length of the trigger character, to make it easy on the caller
            //     queryStartPos: () =>
            //       trackedPosition() +
            //       suggestionPluginTransactionMeta.triggerCharacter.length,
            //     query: "",
            //     decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,
            //     ignoreQueryLength:
            //       suggestionPluginTransactionMeta?.ignoreQueryLength,
            //   };
            // }

            // // Checks if the menu is hidden, in which case it doesn't need to be hidden or updated.
            // if (prev === undefined) {
            //   return prev;
            // }

            // // Checks if the menu should be hidden.
            // if (
            //   // Highlighting text should hide the menu.
            //   newState.selection.from !== newState.selection.to ||
            //   // Transactions with plugin metadata should hide the menu.
            //   suggestionPluginTransactionMeta === null ||
            //   // Certain mouse events should hide the menu.
            //   // TODO: Change to global mousedown listener.
            //   transaction.getMeta("focus") ||
            //   transaction.getMeta("blur") ||
            //   transaction.getMeta("pointer") ||
            //   // Moving the caret before the character which triggered the menu should hide it.
            //   (prev.triggerCharacter !== undefined &&
            //     newState.selection.from < prev.queryStartPos()) ||
            //   // Moving the caret to a new block should hide the menu.
            //   !newState.selection.$from.sameParent(
            //     newState.doc.resolve(prev.queryStartPos()),
            //   )
            // ) {
            //   return undefined;
            // }

            // const next = { ...prev };
            // // here we wi
            // // Updates the current query.
            // next.query = newState.doc.textBetween(
            //   prev.queryStartPos(),
            //   newState.selection.from,
            // );

            // return next;
          },
        },

        props: {
          handleKeyDown(view, event) {
            if (event.key === "Tab") {
              // TODO (discuss with Nick):
              // Plugin priority needs to be below suggestion menu, so no auto complete is triggered when the suggestion menu is open
              // However, Plugin priority needs to be above other Tab handlers (because now indentation will be wrongly prioritized over auto complete)
              const autoCompleteState = this.getState(view.state);

              if (autoCompleteState) {
                // insert suggestion
                view.dispatch(
                  view.state.tr
                    .insertText(
                      autoCompleteState.autoCompleteSuggestion.suggestion,
                    )
                    .setMeta(autoCompletePluginKey, { isUserInput: true }), // isUserInput true to trigger new fetch
                );
                return true;
              }

              // if tab to suggest is enabled (TODO: make configurable)
              view.dispatch(
                view.state.tr.setMeta(autoCompletePluginKey, {
                  isUserInput: true,
                }),
              );
              return true;
            }

            if (event.key === "Escape") {
              self.autoCompleteSuggestions = [];
              self.debounceFetchSuggestions.cancel();
              view.dispatch(view.state.tr.setMeta(autoCompletePluginKey, {}));
              return true;
            }

            return false;
          },
          handleTextInput(view, _from, _to, _text, deflt) {
            const tr = deflt();
            tr.setMeta(autoCompletePluginKey, {
              isUserInput: true,
            });
            view.dispatch(tr);
            return true;
          },

          // Setup decorator on the currently active suggestion.
          decorations(state) {
            const autoCompleteState: AutoCompleteState = this.getState(state);

            if (!autoCompleteState) {
              return null;
            }

            console.log(autoCompleteState);
            // Creates an inline decoration around the trigger character.
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                state.selection.from,
                renderAutoCompleteSuggestion(
                  autoCompleteState.autoCompleteSuggestion.suggestion,
                ),
                {},
              ),
            ]);
          },
        },
      }),
    );
  }
}

function renderAutoCompleteSuggestion(suggestion: string) {
  const element = document.createElement("span");
  element.classList.add("bn-autocomplete-decorator");
  element.textContent = suggestion;
  return element;
}

export function debounceWithAbort<T extends any[], R>(
  fn: (...args: [...T, AbortSignal]) => Promise<R> | R,
  delay = 300, // TODO: configurable
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  const debounced = (...args: T): Promise<R> => {
    // Clear pending timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Abort any in-flight execution
    if (controller) {
      controller.abort();
    }

    controller = new AbortController();
    const signal = controller.signal;

    return new Promise<R>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args, signal);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, delay);
    });
  };

  // External cancel method
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = null;

    if (controller) {
      controller.abort();
    }
    controller = null;
  };

  return debounced;
}

// Add a type for the cancel method
export interface DebouncedFunction<T extends any[], R> {
  (...args: T): Promise<R>;
  cancel(): void;
}

// TODO: more to blocknote API?
// TODO: test with Collaboration edits
// TODO: compare kilocode / cline etc
// TODO: think about advanced scenarios (e.g.: multiple suggestions, etc.)
// TODO: double tap -> extra long
/**
 * Create a new AIExtension instance, this can be passed to the BlockNote editor via the `extensions` option
 */
export function createAIAutoCompleteExtension(
  options: ConstructorParameters<typeof AutoCompleteProseMirrorPlugin>[1],
) {
  return (editor: BlockNoteEditor<any, any, any>) => {
    return new AutoCompleteProseMirrorPlugin(editor, options);
  };
}

/**
 * Return the AIExtension instance from the editor
 */
export function getAIAutoCompleteExtension(
  editor: BlockNoteEditor<any, any, any>,
) {
  return editor.extension(AutoCompleteProseMirrorPlugin);
}
