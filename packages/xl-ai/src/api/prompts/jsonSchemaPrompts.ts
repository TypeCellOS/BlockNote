import { CoreMessage } from "ai";
import { suffixIDs } from "../util/suffixIDs.js";

// TODO don't include child block
export function promptManipulateSelectionJSONSchema(opts: {
  userPrompt: string;
  document: any;
}): Array<CoreMessage> {
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
  userPrompt: string;
  document: any;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content:
        "You're manipulating a text document. Make sure to follow the json schema provided. This is the document:",
    },
    {
      role: "system",
      content: JSON.stringify(suffixIDs(opts.document)),
    },
    {
      role: "system",
      content:
        "This would be an example block: \n" +
        JSON.stringify({
          type: "paragraph",
          props: {},
          content: [
            {
              type: "text",
              text: "Bold text",
              styles: {
                bold: true,
              },
            },
            // {
            //   type: "text",
            //   text: " regular text",
            //   styles: {},
            // },
            {
              type: "text",
              text: " and italic text",
              styles: {
                italic: true,
              },
            },
          ],
        }),
    },
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
