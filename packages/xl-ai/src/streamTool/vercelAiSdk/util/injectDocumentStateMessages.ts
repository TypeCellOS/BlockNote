import { UIMessage } from "ai";
import { DocumentState } from "../../..";

export function injectDocumentStateMessages(
  messages: UIMessage[],
): UIMessage[] {
  return messages.flatMap((message) => {
    if (message.role === "user" && (message.metadata as any)?.documentState) {
      const documentState = (message.metadata as any)
        .documentState as DocumentState<any>;

      return [
        {
          role: "assistant",
          id: "assistant-document-state-" + message.id,
          parts: [
            ...(documentState.selection
              ? [
                  {
                    type: "text" as const,
                    text: `This is the latest state of the selection (ignore previous selections, you MUST issue operations against this latest version of the selection):`,
                  },
                  {
                    type: "text" as const,
                    text: JSON.stringify(documentState.selectedBlocks),
                  },
                  {
                    type: "text" as const,
                    text: `This is the latest state of the entire document (INCLUDING the selected text), 
you can use this to find the selected text to understand the context (but you MUST NOT issue operations against this document, you MUST issue operations against the selection):`,
                  },
                  {
                    type: "text" as const,
                    text: JSON.stringify(documentState.blocks),
                  },
                ]
              : [
                  {
                    type: "text" as const,
                    text:
                      `There is no active selection. This is the latest state of the document (ignore previous documents, you MUST issue operations against this latest version of the document). 
The cursor is BETWEEN two blocks as indicated by cursor: true.
` +
                      (documentState.isEmptyDocument
                        ? `Because the document is empty, YOU MUST first update the empty block before adding new blocks.`
                        : "Prefer updating existing blocks over removing and adding (but this also depends on the user's question)."),
                  },
                  {
                    type: "text" as const,
                    text: JSON.stringify(documentState.blocks),
                  },
                ]),
            // Alternatively, we can use dynamic tools to fake document state retrieval:
            // {
            //   type: "dynamic-tool",
            //   toolName: "getDocument",
            //   input: {},
            //   output: documentState.htmlBlocks,
            //   state: "output-available",
            //   toolCallId: "getDocument-" + message.id,
            // },
            // {
            //   type: "dynamic-tool",
            //   toolName: "getDocumentSelection",
            //   input: {},
            //   output: documentState.selection
            //     ? documentState.htmlSelectedBlocks
            //     : "no selection active",
            //   state: "output-available",
            //   toolCallId: "getDocument-" + message.id,
            // },
          ],
        },
        message,
      ];
    }
    return [message];
  });
}
