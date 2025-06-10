import { CoreMessage } from "ai";
import { PromptBuilder } from "../PromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./jsonPromptData.js";

function promptManipulateSelectionJSONBlocks(opts: {
  userPrompt: string;
  jsonSelectedBlocks: any[];
  jsonDocument: any[];
  isEmptyDocument: boolean;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a selected part of a text document using JSON blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      This is the selection as an array of JSON blocks:`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.jsonSelectedBlocks),
    },

    {
      role: "system",
      content:
        "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
    },
    {
      role: "system",
      content: JSON.stringify(opts.jsonDocument),
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

function promptManipulateDocumentUseJSONBlocks(opts: {
  userPrompt: string;
  jsonBlocks: Array<
    | any
    | {
        cursor: true;
      }
  >;
  isEmptyDocument: boolean;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a text document using JSON blocks. 
        Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
        This is the document as an array of JSON blocks (the cursor is BETWEEN two blocks as indicated by cursor: true):`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.jsonBlocks),
    },
    ...(opts.isEmptyDocument
      ? ([
          {
            role: "system",
            content: `Because the actual document is empty, this is an example document to understand the schema:`,
          },
          {
            role: "system",
            content: JSON.stringify({
              id: "ref3",
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Hello, world! ",
                  styles: {},
                },
                {
                  type: "text",
                  text: "Bold text. ",
                  styles: {
                    bold: true,
                  },
                },
                {
                  type: "link",
                  href: "https://www.w3.org",
                  content: "Link.",
                },
              ],
            }),
          },
        ] satisfies Array<CoreMessage>)
      : []),
    {
      role: "system",
      content: "The user asks you to do the following:",
    },
    {
      role: "system",
      content:
        `First, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.
       EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. 
       EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need \`referenceId\` to point to the block before the cursor with position \`after\` (or block below and \`before\`).
      
      ` +
        (opts.isEmptyDocument
          ? `Because the document is empty, first update the empty block before adding new blocks.`
          : "Prefer updating existing blocks over removing and adding (but this also depends on the user's question)."),
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}

export const defaultJSONPromptBuilder: PromptBuilder = async (editor, opts) => {
  if (opts.selectedBlocks) {
    const data = await getDataForPromptWithSelection(editor, {
      selectedBlocks: opts.selectedBlocks,
    });
    return promptManipulateSelectionJSONBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument: editor.isEmpty,
    });
  } else {
    const data = await getDataForPromptNoSelection(editor, opts);
    return promptManipulateDocumentUseJSONBlocks({
      ...data,
      userPrompt: opts.userPrompt,
      isEmptyDocument: editor.isEmpty,
    });
  }
};
