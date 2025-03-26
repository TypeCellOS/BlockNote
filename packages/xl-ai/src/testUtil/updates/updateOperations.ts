import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { UpdateBlockToolCall } from "../../api/tools/createUpdateBlockTool.js";

/**
 * This file defines a set of test cases that can be used to test update operations to the editor.
 * It focuses on formatting related operations (like changing styles, inline content, props, etc)
 */

type TestUpdateOperation = {
  /**
   * The update operation to apply to the editor
   */
  updateOp: UpdateBlockToolCall<PartialBlock<any, any, any>>;
  /**
   * Description (name) of the test case
   */
  description: string;
  /**
   * For LLM tests, this is a prompt that can be given that should also result in the same update.
   *
   * Note: the test cases in this file focus on formatting, so the prompts might not be very realistic,
   * the goal of these tests is to test whether LLMs can make certain updates technically, not to test
   * the quality of the prompt understanding, etc. (should be in different tests)
   */
  prompt: string;
  /**
   * The capabilities that are required to perform the update.
   * If the LLM does not have these capabilities, the test will be skipped.
   */
  requiredCapabilities?: {
    mentions?: boolean;
    textAlignment?: boolean;
  };
};

// TODO: add test case where existing paragraph is right aligned / colored
// TODO: add test case where some text is colored
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
    prompt: "update the content of the first block to 'Hello, updated content'",
  },
  {
    description: "update block type",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        type: "heading",
        props: {
          level: 1,
        },
        content: [{ type: "text", text: "Hello, world!", styles: {} }],
      },
    },
    prompt: "make the first paragraph a heading",
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
    prompt: "make the first paragraph right aligned",
    requiredCapabilities: {
      textAlignment: true,
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
          level: 1,
        },
        content: [{ type: "text", text: "What's up, world!", styles: {} }],
      },
    },
    prompt:
      "make the first paragraph a heading and update the content to 'What's up, world!'",
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
    prompt:
      "make the first paragraph right aligned and update the content to 'What's up, world!'",
    requiredCapabilities: {
      textAlignment: true,
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
    prompt:
      "update the content of the second block to 'Hello, updated content'",
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
    prompt: "remove the bold style from the second block",
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
            text: "Hello! How ",
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
    prompt:
      "change to say 'Hello! How are you doing?' (remove mention but keep bold text)",
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
    prompt: "make 'world!' (in the first block) bold",
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
              user: "Jane Doe",
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
    prompt: "Change the first paragraph to Hello, Jane Doe! (use a mention)",
    requiredCapabilities: {
      mentions: true,
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
    prompt: "update the mention to Jane Doe",
    requiredCapabilities: {
      mentions: true,
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
    prompt:
      "remove the formatting (turn into plain text without styles or urls) from the last paragraph",
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
    prompt:
      "change the last paragraph to 'Hi, world! Bold the text. Link.' without any markup like bold or link",
  },
];
