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
        "You're manipulating a markdown document. Send me the updated markdown. Existing document:",
    },
    {
      role: "system",
      content: opts.markdown,
    },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}
