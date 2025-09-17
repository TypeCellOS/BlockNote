import { Chat } from "@ai-sdk/react";
import {
  BlockNoteEditor,
  BlockNoteExtension,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  applySuggestions,
  revertSuggestions,
  suggestChanges,
} from "@blocknote/prosemirror-suggest-changes";
import { UIMessage } from "ai";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { fixTablesKey } from "prosemirror-tables";
import { createStore, StoreApi } from "zustand/vanilla";
import { LLMRequestHelpers, LLMRequestOptions } from "./api/LLMRequest.js";

import { defaultHTMLPromptBuilder } from "./api/formats/html-blocks/defaultHTMLPromptBuilder.js";
import { htmlBlockLLMFormat } from "./api/formats/html-blocks/htmlBlocks.js";
import {
  defaultHTMLPromptDataBuilder,
  HTMLPromptData,
} from "./api/formats/html-blocks/htmlPromptData.js";
import {
  BlockNoteUserPrompt,
  PromptBuilder,
  PromptInputDataBuilder,
} from "./api/formats/PromptBuilder.js";
import { trimEmptyBlocks } from "./api/promptHelpers/trimEmptyBlocks.js";
import { createAgentCursorPlugin } from "./plugins/AgentCursorPlugin.js";
import { setupToolCallStreaming } from "./streamTool/vercelAiSdk/util/chatHandlers.js";
import { isEmptyParagraph } from "./util/emptyBlock.js";

type ReadonlyStoreApi<T> = Pick<
  StoreApi<T>,
  "getState" | "getInitialState" | "subscribe"
>;

type AIPluginState = {
  // zustand design considerations:
  //  - moved this to a nested object to have better typescript typing
  //  - if we'd do this without a nested object, then we could easily set "wrong" values,
  //    because "setState" takes a partial object (unless the second parameter "replace" = true),
  //    and thus we'd lose typescript's typing help

  aiMenuState:
    | ({
        /**
         * The ID of the block that the AI menu is opened at.
         * This changes as the AI is making changes to the document
         */
        blockId: string;
      } & (
        | {
            status: "error";
            error: any;
          }
        | {
            status: "user-input" | "thinking" | "ai-writing" | "user-reviewing";
          }
      ))
    | "closed";

  chat?: Chat<UIMessage>;
};

const PLUGIN_KEY = new PluginKey(`blocknote-ai-plugin`);

export class AIExtension extends BlockNoteExtension {
  public static key(): string {
    return "ai";
  }

  // internal store including setters
  private readonly _store = createStore<AIPluginState>()((_set) => ({
    aiMenuState: "closed",
    chat: undefined,
  }));

  /**
   * Returns a read-only zustand store with the state of the AI Extension
   */
  public get store() {
    // externally, don't expose setters (if we want to do so, expose `set` methods seperately)
    return this._store as ReadonlyStoreApi<AIPluginState>;
  }

  /**
   * Returns a zustand store with the global configuration of the AI Extension.
   * These options are used by default across all LLM calls when calling {@link doLLMRequest}
   */
  public readonly options: ReturnType<
    ReturnType<typeof createStore<LLMRequestHelpers>>
  >;

  /**
   * @internal use `createAIExtension` instead
   */
  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: LLMRequestHelpers & {
      /**
       * The name and color of the agent cursor
       *
       * @default { name: "AI", color: "#8bc6ff" }
       */
      agentCursor?: { name: string; color: string };
    },
  ) {
    super();

    this.options = createStore<LLMRequestHelpers>()((_set) => ({
      ...options,
    }));

    this.addProsemirrorPlugin(
      new Plugin({
        key: PLUGIN_KEY,
        filterTransaction: (tr) => {
          const menuState = this.store.getState().aiMenuState;

          if (menuState !== "closed" && menuState.status === "ai-writing") {
            if (tr.getMeta(fixTablesKey)?.fixTables) {
              // the fixtables plugin causes the steps between of the AI Agent to become invalid
              // so we need to prevent it from running
              // (we might need to filter out other / or maybe any transactions during the writing phase)
              return false;
            }
          }
          return true;
        },
      }),
    );
    this.addProsemirrorPlugin(suggestChanges());
    this.addProsemirrorPlugin(
      createAgentCursorPlugin(
        options.agentCursor || { name: "AI", color: "#8bc6ff" },
      ),
    );
  }

  /**
   * Open the AI menu at a specific block
   */
  public openAIMenuAtBlock(blockID: string) {
    this.editor.setForceSelectionVisible(true);
    this.editor.isEditable = false;
    this._store.setState({
      aiMenuState: {
        blockId: blockID,
        status: "user-input",
      },
    });
  }

  /**
   * Close the AI menu
   */
  public closeAIMenu() {
    this._store.setState({
      aiMenuState: "closed",
      chat: undefined,
    });
    this.editor.setForceSelectionVisible(false);
    this.editor.isEditable = true;
    this.editor.focus();
  }

  /**
   * Accept the changes made by the LLM
   */
  public acceptChanges() {
    // This is slightly convoluted, to try to maintain the undo history as much as possible
    // The idea is that the LLM call has appended a number of updates to the document, moving the document from state `A` to state `C`
    // But we want the undo history to skip all of the intermediate states and go straight from `C` to `A`
    // To do this, we capture the document state `C` (post-LLM call), and then reject the suggestions to recover the original document state `A`
    // Then we create an intermediate state `B` that captures the diff between `A` and `C`
    // Then we apply the suggestions to `B` to get the final state `C`
    // This causes the undo history to skip `B` and go straight from `C` back to `A`

    // Capture the document state `C'` (post-LLM call with all suggestions still in the document)
    const markedUpDocument = this.editor.prosemirrorState.doc;

    // revert the suggestions to get back to the original document state `A`
    this.editor.exec((state, dispatch) => {
      return revertSuggestions(state, (tr) => {
        dispatch?.(tr.setMeta("addToHistory", false));
      });
    });

    // Create an intermediate state `B` that captures the diff between the original document and the marked up document
    this.editor.exec((state, dispatch) => {
      const tr = state.tr;
      tr.replace(
        0,
        tr.doc.content.size,
        new Slice(Fragment.from(markedUpDocument), 0, 0),
      );
      const nextState = state.apply(tr);
      // Apply the suggestions to the intermediate state `B` to get the final state `C`
      return applySuggestions(nextState, (resultTr) => {
        dispatch?.(
          tr.replace(
            0,
            tr.doc.content.size,
            new Slice(Fragment.from(resultTr.doc), 0, 0),
          ),
        );
      });
    });

    // If in collaboration mode, merge the changes back into the original yDoc
    this.editor.forkYDocPlugin?.merge({ keepChanges: true });

    this.closeAIMenu();
  }

  /**
   * Reject the changes made by the LLM
   */
  public rejectChanges() {
    // Revert the suggestions to get back to the original document
    this.editor.exec((state, dispatch) => {
      return revertSuggestions(state, (tr) => {
        // Do so without adding to history (so the last undo step is just prior to the LLM call)
        dispatch?.(tr.setMeta("addToHistory", false));
      });
    });

    // If in collaboration mode, discard the changes and revert to the original yDoc
    this.editor.forkYDocPlugin?.merge({ keepChanges: false });
    this.closeAIMenu();
  }

  /**
   * Retry the previous LLM call.
   *
   * Only valid if the current status is "error"
   */
  public async retry() {
    const { aiMenuState, chat } = this.store.getState();
    if (
      aiMenuState === "closed" ||
      aiMenuState.status !== "error"
      // !this.previousRequestOptions TODO
    ) {
      throw new Error("retry() is only valid when a previous response failed");
    }

    if (!chat) {
      throw new Error("chat not found in retry()");
    }

    if (chat?.status === "error") {
      // the LLM call failed (i.e. a network error)
      chat.regenerate();
    } else {
      // an error occurred while parsing / executing the previous LLM call
      // give the LLM a chance to fix the error

      return this.callLLM({
        userPrompt: `An error occured in the previous tool call. Please retry.`,
      });
    }
  }

  /**
   * Update the status of a call to an LLM
   *
   * @warning This method should usually only be used for advanced use-cases
   * if you want to implement how an LLM call is executed. Usually, you should
   * use {@link doLLMRequest} instead which will handle the status updates for you.
   */
  public setAIResponseStatus(
    status:
      | "user-input"
      | "thinking"
      | "ai-writing"
      | "user-reviewing"
      | {
          status: "error";
          error: any;
        },
  ) {
    const aiMenuState = this.store.getState().aiMenuState;
    if (aiMenuState === "closed") {
      return; // TODO: log error?
    }

    if (status === "ai-writing") {
      this.editor.setForceSelectionVisible(false);
    }

    if (typeof status === "object") {
      if (status.status !== "error") {
        throw new UnreachableCaseError(status.status);
      }
      this._store.setState({
        aiMenuState: {
          status: status.status,
          error: status.error,
          blockId: aiMenuState.blockId,
        },
      });
    } else {
      this._store.setState({
        aiMenuState: {
          status: status,
          blockId: aiMenuState.blockId,
        },
      });
    }
  }

  // tool call results
  // errors
  // TODO: retries

  /**
   * Execute a call to an LLM and apply the result to the editor
   */
  public async callLLM(opts: LLMRequestOptions) {
    this.setAIResponseStatus("thinking");
    this.editor.forkYDocPlugin?.fork();

    try {
      if (!this.store.getState().chat) {
        // TODO: what if transport changes?
        console.log("new chat");
        this._store.setState({
          chat: new Chat<UIMessage>({
            sendAutomaticallyWhen: () => false,
            transport: opts.transport || this.options.getState().transport,
          }),
        });
      }
      const chat = this.store.getState().chat!;
      const globalOpts = this.options.getState();

      const {
        // TODO: how to pass extra metadata / body
        userPrompt,
        useSelection,
        deleteEmptyCursorBlock,
        streamToolsProvider,

        promptBuilder,

        transport,
        ...rest
      } = {
        deleteEmptyCursorBlock: true, // default true
        ...globalOpts,
        ...opts,
      };

      let { messageSender } = {
        ...rest,
      };

      if (messageSender && promptBuilder) {
        throw new Error(
          "messageSender and promptBuilder cannot be used together",
        );
      }

      if (!messageSender) {
        messageSender = promptMessageSender(
          promptBuilder ?? defaultHTMLPromptBuilder,
          defaultHTMLPromptDataBuilder,
        );
      }

      const cursorBlock = useSelection
        ? undefined
        : this.editor.getTextCursorPosition().block;

      const emptyCursorBlockToDelete: string | undefined =
        cursorBlock &&
        deleteEmptyCursorBlock &&
        isEmptyParagraph(cursorBlock) &&
        trimEmptyBlocks(this.editor.document).length > 0
          ? cursorBlock.id
          : undefined;

      const selectionInfo = useSelection
        ? this.editor.getSelectionCutBlocks()
        : undefined;

      // TODO, works with retry?
      const streamTools = (
        streamToolsProvider ?? htmlBlockLLMFormat.getStreamToolsProvider()
      ).getStreamTools(
        this.editor,
        selectionInfo
          ? {
              from: selectionInfo._meta.startPos,
              to: selectionInfo._meta.endPos,
            }
          : undefined,
        // TODO: remove?
        (blockId: string) => {
          // NOTE: does this setState with an anon object trigger unnecessary re-renders?
          this._store.setState({
            aiMenuState: {
              blockId,
              status: "ai-writing",
            },
          });
        },
      );

      const executePromise = setupToolCallStreaming(streamTools, chat, () => {
        this.setAIResponseStatus("ai-writing");
        if (emptyCursorBlockToDelete) {
          this.editor.removeBlocks([emptyCursorBlockToDelete]);
        }
      });

      await messageSender.sendMessage({
        editor: this.editor,
        chat,
        blockNoteUserPrompt: {
          userPrompt,
          selectedBlocks: selectionInfo?.blocks,
          streamTools,
          emptyCursorBlockToDelete,
        },
      });

      // TODO: what if no tool calls were made?
      await executePromise;

      this.setAIResponseStatus("user-reviewing");
    } catch (e) {
      // TODO in error state, should we discard the forked document?

      debugger;
      this.setAIResponseStatus({
        status: "error",
        error: e,
      });
      // eslint-disable-next-line no-console
      console.warn("Error calling LLM", e);
    }
  }
}

/**
 * Create a new AIExtension instance, this can be passed to the BlockNote editor via the `extensions` option
 */
export function createAIExtension(
  options: ConstructorParameters<typeof AIExtension>[1],
) {
  return (editor: BlockNoteEditor<any, any, any>) => {
    return new AIExtension(editor, options);
  };
}

/**
 * Return the AIExtension instance from the editor
 */
export function getAIExtension(editor: BlockNoteEditor<any, any, any>) {
  return editor.extension(AIExtension);
}

export type MessageSender = {
  sendMessage: (opts: {
    editor: BlockNoteEditor<any, any, any>;
    chat: Chat<UIMessage>;
    blockNoteUserPrompt: BlockNoteUserPrompt;
  }) => Promise<void>;
};

function promptMessageSender<E = HTMLPromptData>(
  promptBuilder: PromptBuilder<E>,
  promptInputDataBuilder: PromptInputDataBuilder<E>,
): MessageSender {
  return {
    async sendMessage(opts) {
      const promptData = await promptInputDataBuilder(
        opts.editor,
        opts.blockNoteUserPrompt,
      );

      await promptBuilder(opts.chat.messages, promptData);

      return opts.chat.sendMessage(undefined, {
        metadata: {
          streamTools: opts.blockNoteUserPrompt.streamTools,
        },
      });
    },
  };
}
