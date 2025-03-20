import { BlockNoteEditor } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { UpdateBlocksOperation } from "../../api/functions/blocknoteFunctions.js";

type TestUpdateOperation = {
  updateOp: UpdateBlocksOperation;
  description: string;
};

export function getTestEditor() {
  return BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: [
          {
            type: "text",
            text: "Hello, ",
          },
          {
            type: "mention",
            props: {
              user: "John Doe",
            },
          },
          {
            type: "text",
            text: "! How ",
          },
          {
            type: "text",
            text: "are you doing?",
            styles: {
              bold: true,
            },
          },
        ],
      },
      {
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
            href: "https://www.google.com",
            content: "Link.",
          },
        ],
      },
    ],
    schema,
  });
}

export const testUpdateOperations: TestUpdateOperation[] = [
  {
    description: "standard update",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: [{ type: "text", text: "Hello, updated content", styles: {} }],
      },
    },
  },
  {
    description: "update block type",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        type: "heading",
        props: {
          level: "1",
        },
        content: [{ type: "text", text: "Hello, world!", styles: {} }],
      },
    },
  },
  {
    description: "update block prop",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        props: {
          textAlignment: "right",
        },
      },
    },
  },
  {
    description: "update block type and content",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        type: "heading",
        props: {
          level: "1",
        },
        content: [{ type: "text", text: "What's up, world!", styles: {} }],
      },
    },
  },
  {
    description: "update block prop and content",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        props: {
          textAlignment: "right",
        },
        content: [{ type: "text", text: "What's up, world!", styles: {} }],
      },
    },
  },
  {
    description: "styles + ic in source block",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [{ type: "text", text: "Hello, updated content", styles: {} }],
      },
    },
  },
  {
    description: "styles + ic in source block, remove mark",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [
          {
            type: "text",
            text: "Hello, ",
            styles: {},
          },
          {
            type: "mention",
            props: {
              user: "John Doe",
            },
            content: undefined,
          },
          {
            type: "text",
            text: "! How are you doing?",
            styles: {},
          },
        ],
      },
    },
  },
  {
    description: "styles + ic in source block, remove mention",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [
          {
            type: "text",
            text: "Hello, ! How ",
            styles: {},
          },
          {
            type: "text",
            text: "are you doing?",
            styles: {
              bold: true,
            },
          },
        ],
      },
    },
  },
  {
    description: "styles + ic in target block, add mark",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: [
          {
            type: "text",
            text: "Hello, ",
            styles: {},
          },
          {
            type: "text",
            text: "world!",
            styles: {
              bold: true,
            },
          },
        ],
      },
    },
  },
  {
    description: "plain source block, add mention",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: [
          {
            type: "text",
            text: "Hello, ",
            styles: {},
          },
          {
            type: "mention",
            props: {
              user: "John Doe",
            },
            content: undefined,
          },
          {
            type: "text",
            text: "!",
            styles: {},
          },
        ],
      },
    },
  },
  {
    description: "styles + ic in source block, update mention prop",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [
          {
            styles: {},
            type: "text",
            text: "Hello, ",
          },
          {
            content: undefined,
            type: "mention",
            props: {
              user: "Jane Doe",
            },
          },
          {
            styles: {},
            type: "text",
            text: "! How ",
          },
          {
            type: "text",
            text: "are you doing?",
            styles: {
              bold: true,
            },
          },
        ],
      },
    },
  },
  {
    description: "drop mark and link",
    updateOp: {
      type: "update",
      id: "ref3",
      block: {
        content: [
          { type: "text", text: "Hello, world! Bold text. Link.", styles: {} },
        ],
      },
    },
  },
  {
    description: "drop mark and link and change text within mark",
    updateOp: {
      type: "update",
      id: "ref3",
      block: {
        content: [
          { type: "text", text: "Hi, world! Bold the text. Link.", styles: {} },
        ],
      },
    },
  },
];
