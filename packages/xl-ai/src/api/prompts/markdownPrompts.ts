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
      content:
        "You're manipulating a markdown document. Send me the new markdown of the entire updated document. Don't include any other text, comments or wrapping marks. Next message is the existing document in markdown:",
    },
    {
      role: "user",
      content: opts.markdown,
    },
    {
      role: "user",
      content: opts.userPrompt,
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
