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
      content:
        "Return the ENTIRE markdown document (including parts outside the selection), but make sure to ONLY change the selected text (text between [$! and !$]), keep the rest of the document unchanged. DO NOT include the markers in the response.",
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}
