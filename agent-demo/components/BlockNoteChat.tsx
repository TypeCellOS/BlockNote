import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { ChatInit, UIMessage } from "ai";

import {
  aiDocumentFormats,
  AIRequest,
  buildAIRequest,
  sendMessageWithAIRequest,
} from "@blocknote/xl-ai";

class BlockNoteAISDKChatRaw<
  UI_MESSAGE extends UIMessage,
> extends Chat<UI_MESSAGE> {
  public readonly sendMessageOriginal: Chat<UI_MESSAGE>["sendMessage"];
  constructor(
    init: ChatInit<UI_MESSAGE>,
    public editor?: BlockNoteEditor<any, any, any>,
  ) {
    super(init);
    this.sendMessageOriginal = this.sendMessage;
  }

  public sendMessageAlt = async (
    message: Parameters<Chat<UI_MESSAGE>["sendMessage"]>[0],
    options?: Parameters<Chat<UI_MESSAGE>["sendMessage"]>[1],
    aiRequest?: AIRequest,
  ) => {
    if ((options?.metadata as any)?.source === "blocknote-ai") {
      // prevent loops
      return this.sendMessageOriginal(message, options);
    }

    aiRequest =
      aiRequest ??
      buildAIRequest({
        editor: this.editor!,
        useSelection: false,
        deleteEmptyCursorBlock: true,
        streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider(),
        onBlockUpdated: () => {},
        documentStateBuilder:
          aiDocumentFormats.html.defaultPromptInputDataBuilder,
      });

    return sendMessageWithAIRequest(
      this as Chat<any>,
      aiRequest,
      message,
      options,
    );
  };
}

/**
 * A properly typed version of BlockNoteAISDKChatRaw that correctly types
 * the sendMessage method with extended options (streamTools, onStart).
 *
 * This class can be instantiated and provides proper TypeScript typing for
 * the sendMessage method, ensuring that the extended options are recognized
 * by the type system.
 */
export class BlockNoteAISDKChat<
  UI_MESSAGE extends UIMessage,
> extends BlockNoteAISDKChatRaw<UI_MESSAGE> {
  /**
   * Override sendMessage with the correct type signature that includes
   * streamTools and onStart options.
   */
  public override sendMessage: (typeof BlockNoteAISDKChatRaw<UI_MESSAGE>)["prototype"]["sendMessageAlt"] =
    async (message, options, aiRequest) => {
      return this.sendMessageAlt(message as any, options, aiRequest);
    };
}
