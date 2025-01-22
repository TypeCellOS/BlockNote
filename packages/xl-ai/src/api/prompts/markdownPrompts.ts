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
