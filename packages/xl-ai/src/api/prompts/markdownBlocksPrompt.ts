import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";
import { suffixIDs } from "../util/suffixIDs.js";

// TODO don't include child block
export function promptManipulateSelectionMarkdownBlocks(opts: {
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

export function promptManipulateDocumentUseMarkdownBlocks(opts: {
  editor: BlockNoteEditor;
  userPrompt: string;
  markdown: string;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content:
        "You're manipulating a text document, use the tools provided to manipulate the markdown representation of the document. This is the document as an array of blocks in markdown:",
    },
    {
      role: "system",
      content: opts.markdown,
    },
    // {
    //   role: "system",
    //   content:
    //     "This would be an example block: \n" +
    //     JSON.stringify({
    //       type: "paragraph",
    //       props: {},
    //       content: [
    //         {
    //           type: "text",
    //           text: "Bold text",
    //           styles: {
    //             bold: true,
    //           },
    //         },
    //         // {
    //         //   type: "text",
    //         //   text: " regular text",
    //         //   styles: {},
    //         // },
    //         {
    //           type: "text",
    //           text: " and italic text",
    //           styles: {
    //             italic: true,
    //           },
    //         },
    //       ],
    //     }),
    // },
    // {
    //   role: "system",
    //   content:
    //     "Only change formatting like bold / italic etc when the user asks for it. This is the user's question:",
    // },
    {
      role: "user",
      content: opts.userPrompt,
    },
  ];
}
