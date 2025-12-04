import {
  BlockNoteEditor,
  createExtension,
  ExtensionOptions,
  trackPosition,
} from "@blocknote/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type AutoCompleteState =
  | {
      autoCompleteSuggestion: AutoCompleteSuggestion;
    }
  | undefined;

const autoCompletePluginKey = new PluginKey<AutoCompleteState>(
  "AutoCompletePlugin",
);

export type AutoCompleteSuggestion = {
  position?: number;
  suggestion: string;
};

type InternalAutoCompleteSuggestion = {
  position: number;
  suggestion: string;
};

export type AutoCompleteProvider = (
  editor: BlockNoteEditor<any, any, any>,
  signal: AbortSignal,
) => Promise<AutoCompleteSuggestion[]>;

export type AutoCompleteOptions = {
  /**
   * The provider to fetch autocomplete suggestions from.
   * Can be a URL string (uses default provider) or a custom function.
   */
  provider: AutoCompleteProvider | string;
  /**
   * Number of characters of context to send to the API when using the default provider (string URL).
   * Default: 300
   */
  contextLength?: number;
  /** Key to accept autocomplete suggestion. Default: "Tab" */
  acceptKey?: string;
  /** Key to cancel/discard autocomplete suggestion. Default: "Escape" */
  cancelKey?: string;
  /** Debounce delay in milliseconds before fetching suggestions. Default: 300 */
  debounceDelay?: number;
  /** 
   * when true: only fetch suggestions when the cursor is at the end of a block
   * when false: fetch suggestions at every cursor position (also in the middle of a sentence).
   * 
   * @default: false
   */
  onlyAtEndOfBlock?: boolean;
};

function getMatchingSuggestions(
  autoCompleteSuggestions: InternalAutoCompleteSuggestion[],
  state: EditorState,
): InternalAutoCompleteSuggestion[] {
  return autoCompleteSuggestions.flatMap((suggestion) => {
    // Suggestion must be before or at current cursor position
    if (suggestion.position > state.selection.from) {
      return [];
    }

    // Suggestion must be in the same parent block
    if (
      !state.doc
        .resolve(suggestion.position)
        .sameParent(state.selection.$from)
    ) {
      return [];
    }

    // Get text that has been typed since the suggestion 
    // start position
    const text = state.doc.textBetween(
      suggestion.position,
      state.selection.from,
    );
    
    // User's typed text must be a prefix of the suggestion
    if (
      suggestion.suggestion.startsWith(text) &&
      suggestion.suggestion.length > text.length
    ) {
      return [
        {
          position: suggestion.position,
          suggestion: suggestion.suggestion.slice(text.length),
        },
      ];
    }

    return [];
  });
}

function createDefaultAutoCompleteProvider(args: {
  url: string;
  contextLength?: number;
}): AutoCompleteProvider {
  const { url, contextLength = 300 } = args;
  return async (editor, signal) => {
    const state = editor.prosemirrorState;
    // Get last N chars of context
    const text = state.doc.textBetween(
      Math.max(0, state.selection.from - contextLength),
      state.selection.from,
      "\n",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AutoComplete request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions.map((suggestion: string) => ({
      suggestion: suggestion,
    }));
  };
}

export const AIAutoCompleteExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<AutoCompleteOptions>) => {
    let autoCompleteSuggestions: InternalAutoCompleteSuggestion[] = [];

    const acceptKey = options.acceptKey || "Tab";
    const cancelKey = options.cancelKey || "Escape";
    const debounceDelay = options.debounceDelay ?? 300;

    // Determine the provider to use:
    // 1. If a string is provided, create a default provider that fetches from that URL.
    // 2. If a function is provided, use it directly.
    const provider =
      typeof options.provider === "string"
        ? createDefaultAutoCompleteProvider({
            url: options.provider,
            contextLength: options.contextLength,
          })
        : options.provider;

    const debounceFetchSuggestions = debounceWithAbort(
      async (editor: BlockNoteEditor<any, any, any>, signal: AbortSignal) => {
        const position = editor.prosemirrorState.selection.from;

        if (options.onlyAtEndOfBlock) {
          const pos = editor.prosemirrorState.doc.resolve(position);
          const textAfter = editor.prosemirrorState.doc.textBetween(position, pos.after())

          if (textAfter.trim() !== "") {
            return;
          }
        } 

        const tracked = trackPosition(editor, position);

        // fetch suggestions
        const newAutoCompleteSuggestions = await provider(editor, signal);

        if (signal.aborted) {
          return;
        }

        // Fill in missing positions with current cursor position
        const processedSuggestions = newAutoCompleteSuggestions.map(
          (suggestion) => ({
            position: tracked(),
            ...suggestion,
          }),
        );
        
        autoCompleteSuggestions = processedSuggestions;
        // Force plugin state update to trigger decorations refresh
        editor.transact((tr) => {
          tr.setMeta(autoCompletePluginKey, {});
        });
      },
      debounceDelay,
    );

    /**
     * Accepts the current autocomplete suggestion and inserts it into the editor.
     * @returns true if a suggestion was accepted, false otherwise
     */
    const acceptAutoCompleteSuggestion = (): boolean => {
      const state = autoCompletePluginKey.getState(editor.prosemirrorState);
      if (state) {
        editor.transact((tr) => {
          tr.insertText(state.autoCompleteSuggestion.suggestion).setMeta(
            autoCompletePluginKey,
            { isUserInput: true },
          );
        });
        return true;
      }
      return false;
    };

    /**
     * Discards all current autocomplete suggestions.
     */
    const discardAutoCompleteSuggestions = (): void => {
      autoCompleteSuggestions = [];
      debounceFetchSuggestions.cancel();
      editor.transact((tr) => {
        tr.setMeta(autoCompletePluginKey, {});
      });
    };

    /**
     * manually trigger fetching autocomplete suggestions at the current 
     * cursor position
     * 
     * (can be used if you want to configure a key to let the user trigger
     * autocomplete suggestions without having to type)
     */
    const triggerAutoComplete = (): void => {
      editor.transact((tr) => {
        tr.setMeta(autoCompletePluginKey, {
          isUserInput: true,
        });
      });
    };

    return {
      acceptAutoCompleteSuggestion,
      discardAutoCompleteSuggestions,
      triggerAutoComplete,
      key: "aiAutoCompleteExtension",
      priority: 1000000, // should be lower (e.g.: -1000 to be below suggestion menu, but that currently breaks Tab)
      prosemirrorPlugins: [
        new Plugin({
          key: autoCompletePluginKey,

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
                // (discuss with Nick what ideal architecture would be)
                queueMicrotask(() => {
                  debounceFetchSuggestions(editor).catch((error) => {
                    if (error.name === "AbortError") {
                      // don't log
                      return;
                    }
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

          // TODO (discuss with Nick):
          // - We need to make sure autocomplete is not triggered when a suggestion menu is open
          // - --> priority of handleTextInput needs to be below suggestion menu so that is handled first
          // (currently broken)
          // - We need to make sure Tab completion (handleKeyDown) is handled before Tab-to-indent
          // (currently ok)
          props: {
            handleKeyDown(view, event) {
              if (event.key === acceptKey) {
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

                return false;
              }

              if (event.key === cancelKey) {
                discardAutoCompleteSuggestions();
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
  delay = 300,
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
