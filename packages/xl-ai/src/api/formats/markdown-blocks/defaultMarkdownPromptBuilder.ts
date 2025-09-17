import { UIMessage } from "ai";
import type { PromptBuilder } from "../PromptBuilder.js";
import { MarkdownPromptData } from "./markdownPromptData.js";

function promptManipulateSelectionMarkdownBlocks(
  messages: UIMessage[],
  opts: Exclude<MarkdownPromptData, { selection: false }>,
): void {
  if (messages.length > 0) {
    messages.push(
      {
        role: "assistant",
        id: "document-state-" + messages.length,
        parts: [
          {
            type: "text",
            text: `This is the latest state of the selection (ignore previous selections, you MUST issue operations against this latest version of the selection):`,
          },
          {
            type: "text",
            text: JSON.stringify(opts.markdownSelectedBlocks),
          },
          {
            type: "text",
            text: "This is the latest state of the document (INCLUDING the selected text), find the selected text in there to understand the context:",
          },
          {
            type: "text",
            text: JSON.stringify(opts.markdownDocument),
          },
        ],
      },
      {
        role: "user",
        id: "user-prompt-" + messages.length,
        parts: [
          {
            type: "text",
            text: "The user asks you to do the following:",
          },
          {
            type: "text",
            text: opts.userPrompt,
          },
        ],
      },
    );
  }

  messages.push(
    {
      role: "system",
      id: "document-state-intro",
      parts: [
        {
          type: "text",
          text: `You're manipulating a selected part of a text document using Markdown blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids.
      This is the selection as an array of Markdown blocks:`,
        },
        {
          type: "text",
          text: JSON.stringify(opts.markdownSelectedBlocks),
        },
        {
          type: "text",
          text: "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
        },
        {
          type: "text",
          text: JSON.stringify(opts.markdownDocument),
        },
      ],
    },
    {
      role: "user",
      id: "user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  );
}

function promptManipulateDocumentUseMarkdownBlocks(
  messages: UIMessage[],
  opts: Exclude<MarkdownPromptData, { selection: true }>,
): void {
  if (messages.length > 0) {
    messages.push(
      {
        role: "assistant",
        id: "document-state-" + messages.length,
        parts: [
          {
            type: "text",
            text: `This is the latest state of the document (ignore previous documents, you MUST issue operations against this latest version of the document):`,
          },
          {
            type: "text",
            text: JSON.stringify(opts.markdownBlocks),
          },
        ],
      },
      {
        role: "user",
        id: "user-prompt-" + messages.length,
        parts: [
          {
            type: "text",
            text: opts.userPrompt,
          },
        ],
      },
    );
    return;
  }
  messages.push(
    {
      role: "system",
      id: "document-state",
      parts: [
        {
          type: "text",
          text: `You're manipulating a text document using Markdown blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
        This is the initial document as an array of Markdown blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
        },
        {
          type: "text",
          text: JSON.stringify(opts.markdownBlocks),
        },
        {
          type: "text",
          text:
            `First, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.
       EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. 
       EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), 
       then you need \`referenceId\` to point to the block before the cursor with position \`after\` (or block below and \`before\`).
      
      ` +
            (opts.isEmptyDocument
              ? `Because the document is empty, first update the empty block before adding new blocks.`
              : "Prefer updating existing blocks over removing and adding (but this also depends on the user's question)."),
        },
      ],
    },
    {
      role: "user",
      id: "user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  );
}

export const defaultMarkdownPromptBuilder: PromptBuilder<
  MarkdownPromptData
> = async (messages, inputData) => {
  if (inputData.selection) {
    promptManipulateSelectionMarkdownBlocks(messages, inputData);
  } else {
    promptManipulateDocumentUseMarkdownBlocks(messages, inputData);
  }
};
