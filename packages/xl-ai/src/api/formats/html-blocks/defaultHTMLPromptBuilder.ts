import { CoreMessage } from "ai";
import type { PromptBuilder } from "../PromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./htmlPromptData.js";

function promptManipulateSelectionHTMLBlocks(opts: {
  userPrompt: string;
  htmlSelectedBlocks: {
    id: string;
    block: string;
  }[];
  htmlDocument: {
    block: string;
  }[];
  isEmptyDocument: boolean;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a selected part of a text document using HTML blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      List items are 1 block with 1 list item each, so block content \`<ul><li>item1</li></ul>\` is valid, but \`<ul><li>item1</li><li>item2</li></ul>\` is invalid. We'll merge them automatically.
      This is the selection as an array of html blocks:`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.htmlSelectedBlocks),
    },
    {
      role: "system",
      content:
        "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
    },
    {
      role: "system",
      content: JSON.stringify(opts.htmlDocument),
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

function promptManipulateDocumentUseHTMLBlocks(opts: {
  userPrompt: string;
  htmlBlocks: Array<
    | {
        id: string;
        block: string;
      }
    | {
        cursor: true;
      }
  >;
  isEmptyDocument: boolean;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a text document using HTML blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
        List items are 1 block with 1 list item each, so block content \`<ul><li>item1</li></ul>\` is valid, but \`<ul><li>item1</li><li>item2</li></ul>\` is invalid. We'll merge them automatically.
        For code blocks, you can use the \`data-language\` attribute on a code block to specify the language.
        This is the document as an array of html blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.htmlBlocks),
    },
    {
      role: "system",
      content:
        `First, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.
       EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. 
       EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), 
       then you need \`referenceId\` to point to the block before the cursor with position \`after\` (or block below and \`before\`).
      
      ` +
        (opts.isEmptyDocument
          ? `Because the document is empty, first update the empty block before adding new blocks.`
          : "Prefer updating existing blocks over removing and adding (but this also depends on the user's question)."),
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

export const defaultHTMLPromptBuilder: PromptBuilder = async (editor, opts) => {
  if (opts.selectedBlocks) {
    const data = await getDataForPromptWithSelection(editor, {
      selectedBlocks: opts.selectedBlocks,
    });

    if (opts.previousMessages) {
      return [
        ...opts.previousMessages,
        {
          role: "system",
          content: `After processing the previous response, this is the updated selection.
            Ignore previous documents, you MUST issue operations against this latest version of the document:`,
        },
        {
          role: "system",
          content: JSON.stringify(data.htmlSelectedBlocks),
        },
        {
          role: "system",
          content: "This is the updated entire document:",
        },
        {
          role: "system",
          content: JSON.stringify(data.htmlDocument),
        },
        {
          role: "system",
          content: `You SHOULD use "update" operations to update blocks you added / edited previously 
          (unless the user explicitly asks you otherwise to add or delete other blocks).
          
          The user now asks you to do the following:`,
        },
        {
          role: "user",
          content: opts.userPrompt,
        },
      ];
    }

    return promptManipulateSelectionHTMLBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument: editor.isEmpty,
    });
  } else {
    const data = await getDataForPromptNoSelection(editor, opts);
    if (opts.previousMessages) {
      return [
        ...opts.previousMessages,
        {
          role: "system",
          content: `After processing the previous response, this is the updated document.
            Ignore previous documents, you MUST issue operations against this latest version of the document:`,
        },
        {
          role: "system",
          content: JSON.stringify(data.htmlBlocks),
        },
        {
          role: "system",
          content: `You SHOULD use "update" operations to update blocks you added / edited previously 
          (unless the user explicitly asks you otherwise to add or delete other blocks).
          
          The user now asks you to do the following:`,
        },
        {
          role: "user",
          content: opts.userPrompt,
        },
      ];
    }

    return promptManipulateDocumentUseHTMLBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument: editor.isEmpty,
    });
  }
};
