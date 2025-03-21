import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";

export function promptManipulateDocumentUseMarkdown(opts: {
  editor: BlockNoteEditor;
  userPrompt: string;
  markdown: string;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: "You're helping the user redact / write a markdown document.",
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
      content:
        "Send me the new markdown of the entire updated document in markdown. Make sure to use duplicate new lines (\n\n) to separate blocks as usual in markdown. Don't include any other text, comments or wrapping marks.",
    },
    {
      role: "system",
      content: "This is the document the user wants to update:",
    },
    {
      role: "system",
      content: opts.markdown,
    },
  ];
}

export function promptManipulateDocumentUseMarkdownWithSelection(opts: {
  editor: BlockNoteEditor;
  userPrompt: string;
  markdown: string;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content:
        "You're manipulating a markdown document. The user selected everything between [$! and !$], including blocks in between. Don't include any other text, comments or wrapping marks. Next message is the existing document in markdown:",
    },
    {
      role: "user",
      content: opts.markdown,
    },
    {
      role: "system",
      content: `You MUST return the ENTIRE markdown document (from start to end, INCLUDING parts outside the selection). 
        But, the next user prompt ONLY applies to the selectiom so make sure to ONLY change the selected text (text between [$! and !$]) and keep the rest of the document unchanged. 
        DO NOT include the markers in the response.`,
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}
