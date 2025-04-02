import { CoreMessage } from "ai";

// TODO don't include child block
export function promptManipulateSelectionHTMLBlocks(opts: {
  userPrompt: string;
  html: {
    id: string;
    block: string;
  }[];
  document: {
    block: string;
  }[];
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You're manipulating a selected part of a text document using HTML blocks. 
      Make sure to follow the json schema provided and always include the trailing $ in ids. 
      This is the selection as an array of html blocks:`,
    },
    {
      role: "system",
      content: JSON.stringify(opts.html),
    },

    {
      role: "system",
      content:
        "This is the entire document (INCLUDING the selected text), find the selected text in there to understand the context:",
    },
    {
      role: "system",
      content: JSON.stringify(opts.document),
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

export function promptManipulateDocumentUseHTMLBlocks(opts: {
  userPrompt: string;
  html: Array<
    | {
        id: string;
        block: string;
      }
    | {
        cursor: true;
      }
  >;
}): Array<CoreMessage> {
  return [
    {
      role: "system",
      content:
        "You're manipulating a text document using HTML blocks. Make sure to follow the json schema provided and always include the trailing $ in ids. This is the document as an array of html blocks (the cursor is BETWEEN two blocks indicated by cursor: true):",
    },
    {
      role: "system",
      content: JSON.stringify(opts.html),
    },
    {
      role: "system",
      content: "The user asks you to do the following:",
    },

    {
      role: "user",
      content: opts.userPrompt,
    },
    {
      role: "system",
      content: `First, determine what part of the document the user is talking about (take cursor into account if needed, e.g.: "below" probably indicates the block(s) after the cursor). 
      Prefer updating blocks over adding or removing (but this also depends on the user's question).`,
    },
  ];
}
