import { UIMessage } from "ai";
import { trimEmptyBlocks } from "../../promptHelpers/trimEmptyBlocks.js";
import type { PromptBuilder } from "../PromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./markdownPromptData.js";

function promptManipulateSelectionMarkdownBlocks(opts: {
  userPrompt: string;
  markdownSelectedBlocks: {
    id: string;
    block: string;
  }[];
  markdownDocument: {
    block: string;
  }[];
  isEmptyDocument: boolean;
}): Array<UIMessage> {
  return [
    {
      role: "system",
      id: "markdown-selected-blocks",
      parts: [
        {
          type: "text",
          text: `You're manipulating a selected part of a text document using Markdown blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      
      This is the selection as an array of markdown blocks:`,
        },
      ],
    },
    {
      role: "system",
      id: "markdown-selected-blocks-json",
      parts: [
        {
          type: "text",
          text: JSON.stringify(opts.markdownSelectedBlocks),
        },
      ],
    },
    {
      role: "system",
      id: "markdown-document",
      parts: [
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
      role: "system",
      id: "markdown-user-prompt",
      parts: [
        {
          type: "text",
          text: "The user asks you to do the following:",
        },
      ],
    },
    {
      role: "user",
      id: "markdown-user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  ];
}

function promptManipulateDocumentUseMarkdownBlocks(opts: {
  userPrompt: string;
  markdownBlocks: Array<
    | {
        id: string;
        block: string;
      }
    | {
        cursor: true;
      }
  >;
  isEmptyDocument: boolean;
}): Array<UIMessage> {
  return [
    {
      role: "system",
      id: "markdown-document",
      parts: [
        {
          type: "text",
          text: `You're manipulating a text document using Markdown blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 

        This is the document as an array of markdown blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
        },
      ],
    },
    {
      role: "system",
      id: "markdown-document-json",
      parts: [
        {
          type: "text",
          text: JSON.stringify(opts.markdownBlocks),
        },
      ],
    },
    {
      role: "system",
      id: "markdown-user-prompt",
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
      id: "markdown-user-prompt",
      parts: [
        {
          type: "text",
          text: "The user asks you to do the following:",
        },
      ],
    },
    {
      role: "user",
      id: "markdown-user-prompt",
      parts: [
        {
          type: "text",
          text: opts.userPrompt,
        },
      ],
    },
  ];
}

export const defaultMarkdownPromptBuilder: PromptBuilder = async (
  editor,
  opts,
) => {
  const isEmptyDocument = trimEmptyBlocks(editor.document).length === 0;

  if (opts.selectedBlocks) {
    const data = await getDataForPromptWithSelection(editor, {
      selectedBlocks: opts.selectedBlocks,
    });

    if (opts.previousMessages) {
      return [
        ...opts.previousMessages,
        {
          role: "system",
          id: "markdown-previous-response",
          parts: [
            {
              type: "text",
              text: `After processing the previous response, this is the updated selection.
            Ignore previous documents, you MUST issue operations against this latest version of the document:`,
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-json",
          parts: [
            {
              type: "text",
              text: JSON.stringify(data.markdownSelectedBlocks),
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-document",
          parts: [
            {
              type: "text",
              text: "This is the updated entire document:",
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-document-json",
          parts: [
            {
              type: "text",
              text: JSON.stringify(data.markdownDocument),
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-user-prompt",
          parts: [
            {
              type: "text",
              text: `You SHOULD use "update" operations to update blocks you added / edited previously 
          (unless the user explicitly asks you otherwise to add or delete other blocks).
          
          The user now asks you to do the following:`,
            },
          ],
        },
        {
          role: "user",
          id: "markdown-previous-response-user-prompt",
          parts: [
            {
              type: "text",
              text: opts.userPrompt,
            },
          ],
        },
      ];
    }

    return promptManipulateSelectionMarkdownBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument,
    });
  } else {
    const data = await getDataForPromptNoSelection(editor, opts);
    if (opts.previousMessages) {
      return [
        ...opts.previousMessages,
        {
          role: "system",
          id: "markdown-previous-response",
          parts: [
            {
              type: "text",
              text: `After processing the previous response, this is the updated document.
            Ignore previous documents, you MUST issue operations against this latest version of the document:`,
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-json",
          parts: [
            {
              type: "text",
              text: JSON.stringify(data.markdownBlocks),
            },
          ],
        },
        {
          role: "system",
          id: "markdown-previous-response-user-prompt",
          parts: [
            {
              type: "text",
              text: `You SHOULD use "update" operations to update blocks you added / edited previously 
          (unless the user explicitly asks you otherwise to add or delete other blocks).
          
          The user now asks you to do the following:`,
            },
          ],
        },
        {
          role: "user",
          id: "markdown-previous-response-user-prompt",
          parts: [
            {
              type: "text",
              text: opts.userPrompt,
            },
          ],
        },
      ];
    }

    return promptManipulateDocumentUseMarkdownBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument,
    });
  }
};
