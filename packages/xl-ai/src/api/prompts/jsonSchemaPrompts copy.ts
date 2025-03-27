import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";
import { suffixIDs } from "../util/suffixIDs.js";

// TODO don't include child block
export function promptManipulateSelectionJSONSchema(opts: {
  editor: BlockNoteEditor;
  userPrompt: string;
  document: any;
}): Array<CoreMessage> {
  if (!opts.editor.getSelection()) {
    throw new Error("No selection");
  }
  return [
    {
      role: "system",
      content: `You're manipulating a text document. Make sure to follow the json schema provided. 
            The user selected everything between [$! and !$], including blocks in between.`,
    },
    {
      role: "system",
      content: JSON.stringify(suffixIDs(opts.document)),
    },
    {
      role: "system",
      content:
        "Make sure to ONLY affect the selected text and blocks (split words if necessary), and don't include the markers in the response.",
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}

export function promptManipulateDocumentUseJSONSchema(opts: {
  editor: BlockNoteEditor;
  userPrompt: string;
  document: any;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content:
        "You're helping the user redact / write a rich text document (in JSON format).",
    },
    {
      role: "system",
      content: "This is what the user wants you to do:",
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
    {
      role: "system",
      content: "This is the document the user wants to update:",
    },
    {
      role: "system",
      content: JSON.stringify(suffixIDs(opts.document)),
    },
    {
      role: "system",
      content:
        "Use the JSON schema provided. For reference, here's an example of how the block format works: \n" +
        JSON.stringify({
          type: "paragraph",
          props: {},
          content: [
            {
              styles: {},
              type: "text",
              text: "A sentence with regular text.",
            },
            {
              styles: {
                bold: true,
              },
              type: "text",
              text: "Bold text",
            },
            {
              styles: {
                italic: true,
              },
              type: "text",
              text: " and italic text",
            },
          ],
        }),
    },
    {
      role: "system",
      content: `First, decide if the user wants you to add / remove / update blocks, or a combination. 
      When updating an existing block, make sure to take the existing text (block content) and update it, don't just add text at the end of the block unless the user asks for it.`,
    },
  ];
}
