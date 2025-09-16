import { UIMessage } from "ai";
import type { PromptBuilder } from "../PromptBuilder.js";
import { HTMLPromptData } from "./htmlPromptData.js";

function promptManipulateSelectionHTMLBlocks(
  opts: Exclude<HTMLPromptData, { selection: false }>,
): Array<UIMessage> {
  return [
    {
      role: "system",
      id: "html-selected-blocks",
      parts: [
        {
          type: "text",
          text: `You're manipulating a selected part of a text document using HTML blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      List items are 1 block with 1 list item each, so block content \`<ul><li>item1</li></ul>\` is valid, but \`<ul><li>item1</li><li>item2</li></ul>\` is invalid. We'll merge them automatically.
      This is the selection as an array of html blocks:`,
        },
      ],
    },
    {
      role: "system",
      id: "html-selected-blocks-json",
      parts: [
        {
          type: "text",
          text: JSON.stringify(opts.htmlSelectedBlocks),
        },
      ],
    },
    {
      role: "system",
      id: "html-document",
      parts: [
        {
          type: "text",
          text: "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
        },
        {
          type: "text",
          text: JSON.stringify(opts.htmlDocument),
        },
      ],
    },
    {
      role: "system",
      id: "html-user-prompt",
      parts: [
        {
          type: "text",
          text: "The user asks you to do the following:",
        },
      ],
    },
    {
      role: "user",
      id: "html-user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  ];
}

function promptManipulateDocumentUseHTMLBlocks(
  opts: Exclude<HTMLPromptData, { selection: true }>,
): Array<UIMessage> {
  return [
    {
      role: "system",
      id: "html-document",
      parts: [
        {
          type: "text",
          text: `You're manipulating a text document using HTML blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
        List items are 1 block with 1 list item each, so block content \`<ul><li>item1</li></ul>\` is valid, but \`<ul><li>item1</li><li>item2</li></ul>\` is invalid. We'll merge them automatically.
        For code blocks, you can use the \`data-language\` attribute on a code block to specify the language.
        This is the document as an array of html blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
        },
      ],
    },
    {
      role: "system",
      id: "html-document-json",
      parts: [
        {
          type: "text",
          text: JSON.stringify(opts.htmlBlocks),
        },
      ],
    },
    {
      role: "system",
      id: "html-user-prompt",
      parts: [
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
      role: "system",
      id: "html-user-prompt",
      parts: [
        {
          type: "text",
          text: "The user asks you to do the following:",
        },
      ],
    },
    {
      role: "user",
      id: "html-user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  ];
}

export const defaultHTMLPromptBuilder: PromptBuilder<HTMLPromptData> = async (
  inputData,
) => {
  if (inputData.selection) {
    return promptManipulateSelectionHTMLBlocks(inputData);
  } else {
    return promptManipulateDocumentUseHTMLBlocks(inputData);
  }
};
