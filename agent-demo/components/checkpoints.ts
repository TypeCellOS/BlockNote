import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { isToolUIPart } from "ai";

export function trackToolCallCheckpoints(
  chat: Chat<any>,
  editor: BlockNoteEditor<any, any, any>,
) {
  const checkpoints = new Map<
    string,
    {
      bn: any;
      pm: any;
    }
  >();

  /**
   * Note: this approach has a flaw that "output-available" (in chatHandlers)
   * is only set once all tool calls have been completed.
   *
   * If the LLM uses parallel tool calling, all checkpoints will be the same
   *
   * It would be nicer to set "output-available" at the correct time,
   * and maybe also integrate this checkpoint logic there.
   *
   * However, this would require diving deep on streams, for now we consider this edge-case ok
   */
  const dispose = chat["~registerMessagesCallback"](() => {
    for (const message of chat.messages) {
      for (const part of message.parts) {
        if (
          isToolUIPart(part) &&
          part.type === "tool-applyDocumentOperations"
        ) {
          if (
            part.state === "output-available" &&
            part.output !== "<no result>" && // this <no-result> is an assistant-ui thing
            !checkpoints.has(part.toolCallId)
          ) {
            checkpoints.set(part.toolCallId, {
              bn: editor.document,
              pm: editor.prosemirrorState.doc.toJSON(),
            });
          }
        }
      }
    }
  });
  return {
    checkpoints,
    dispose,
  };
}
