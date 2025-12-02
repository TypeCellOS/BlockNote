import {
  BlockNoteEditor,
  createExtension,
  ExtensionOptions,
} from "@blocknote/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type AutoCompleteState =
  | {
      autoCompleteSuggestion: AutoCompleteSuggestion;
    }
  | undefined;

const autoCompletePluginKey = new PluginKey<{ isUserInput: boolean }>(
  "AutoCompletePlugin",
);

type AutoCompleteSuggestion = {
  position: number;
  suggestion: string;
};

type AutoCompleteProvider = (
  editor: BlockNoteEditor<any, any, any>,
  signal: AbortSignal,
) => Promise<AutoCompleteSuggestion[]>;

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

export const AIAutoCompleteExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<{ autoCompleteProvider: AutoCompleteProvider }>) => {
    let autoCompleteSuggestions: AutoCompleteSuggestion[] = [];

    const debounceFetchSuggestions = debounceWithAbort(
      async (editor: BlockNoteEditor<any, any, any>, signal: AbortSignal) => {
        // fetch suggestions
        const newAutoCompleteSuggestions = await options.autoCompleteProvider(
          editor,
          signal,
        );

        // TODO: map positions?

        if (signal.aborted) {
          return;
        }

        autoCompleteSuggestions = newAutoCompleteSuggestions;
        editor.transact((tr) => {
          tr.setMeta(autoCompletePluginKey, {
            autoCompleteSuggestions,
          });
        });
      },
    );

    return {
      key: "aiAutoCompleteExtension",
      priority: 1000000, // should be lower (e.g.: -1000 to be below suggestion menu, but that currently breaks Tab)
      prosemirrorPlugins: [
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
                debounceFetchSuggestions.cancel();
                return undefined;
              }

              // Are there matching suggestions?
              const matchingSuggestions = getMatchingSuggestions(
                autoCompleteSuggestions,
                newState,
              );

              if (matchingSuggestions.length > 0) {
                debounceFetchSuggestions.cancel();
                return {
                  autoCompleteSuggestion: matchingSuggestions[0],
                };
              }

              // No matching suggestions, if isUserInput is true, debounce fetch suggestions
              if (transaction.getMeta(autoCompletePluginKey)?.isUserInput) {
                // TODO: this queueMicrotask is a workaround to ensure the transaction is applied before the debounceFetchSuggestions is called
                // (discuss with Nick what ideal architecture would be)
                queueMicrotask(() => {
                  debounceFetchSuggestions(editor).catch((error) => {
                    /* eslint-disable-next-line no-console */
                    console.error(error);
                  });
                });
              } else {
                // clear suggestions
                autoCompleteSuggestions = [];
              }
              return undefined;
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
                autoCompleteSuggestions = [];
                debounceFetchSuggestions.cancel();
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

              // console.log(autoCompleteState);
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
      ],
    };
  },
);

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

// TODO: move more to blocknote API?
// TODO: test with Collaboration edits
// TODO: compare kilocode / cline etc
// TODO: think about advanced scenarios (e.g.: multiple suggestions, etc.)
// TODO: double tap -> insert extra long suggestion
