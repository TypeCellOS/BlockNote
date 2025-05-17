import { CoreMessage } from "ai";
import { PromptBuilder } from "../PromptBuilder.js";
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
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a selected part of a text document using markdown blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      This is the selection as an array of markdown blocks:`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.markdownSelectedBlocks),
    },

    {
      role: "system",
      content:
        "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
    },
    {
      role: "system",
      content: JSON.stringify(opts.markdownDocument),
    },
    {
      role: "system",
      content: "The user asks you to do the following:",
    },
    {
      role: "user",
      content: opts.userPrompt,
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
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a text document using markdown blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
        This is the document as an array of markdown blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.markdownBlocks),
    },
    {
      role: "system",
      content: "The user asks you to do the following:",
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
    {
      role: "system",
      content: `First, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.
       EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. 
       EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need \`referenceId\` to point to the block before the cursor with position \`after\` (or block below and \`before\`).
      
      Prefer updating blocks over adding or removing (but this also depends on the user's question).`,
    },
  ];
}

export const defaultMarkdownPromptBuilder: PromptBuilder = async (
  editor,
  opts,
) => {
  if (opts.selectedBlocks) {
    const data = await getDataForPromptWithSelection(editor, {
      selectedBlocks: opts.selectedBlocks,
    });
    return promptManipulateSelectionMarkdownBlocks({
      ...data,
      userPrompt: opts.userPrompt,
    });
  } else {
    const data = await getDataForPromptNoSelection(editor, opts);
    return promptManipulateDocumentUseMarkdownBlocks({
      ...data,
      userPrompt: opts.userPrompt,
    });
  }
};
