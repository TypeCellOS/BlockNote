import { BlockNoteEditor, getBlockInfo, getNodeById, PartialBlock } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { createAIExtension } from "../../AIExtension.js";
import { UpdateBlockToolCall } from "../../api/tools/createUpdateBlockTool.js";

/**
 * This file defines a set of test cases that can be used to test update operations to the editor.
 * It focuses on formatting related operations (like changing styles, inline content, props, etc)
 */

export type TestUpdateOperation = {
  /**
   * The editor to apply the update to
   */
  editor: () => BlockNoteEditor<any, any, any>;
  /**
   * The update operation to apply to the editor
   */
  updateOp: UpdateBlockToolCall<PartialBlock<any, any, any>>;
  /**
   * If provided, this function will be used to get the selection to use for the test.
   */
  getTestSelection?: (editor: BlockNoteEditor<any, any, any>) => {
    from: number;
    to: number;
  };
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
  userPrompt: string;
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
            text: "are you doing? ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "I'm feeling blue!",
            styles: {
              textColor: "blue",
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
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
}

export function getTableTestEditor() {
  return BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "Table Cell 6",
              ],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
            },
          ],
        },
      },
    ],
    schema,
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
}

export const testUpdateOperations: TestUpdateOperation[] = [
  {
    editor: getTestEditor,
    description: "standard update",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: [{ type: "text", text: "Hallo, Welt!", styles: {} }],
      },
    },
    userPrompt: "translate the first paragraph to german",
  },
  {
    editor: getTestEditor,
    description: "translate selection",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [{ type: "text", text: "Hallo", styles: {} }],
      },
    },
    getTestSelection: (editor: BlockNoteEditor<any, any, any>) => {
      const posInfo = getNodeById("ref2", editor.prosemirrorState.doc)!;
      const block = getBlockInfo(posInfo);
      if (!block.isBlockContainer) {
        throw new Error("Block is not a block container");
      }
      return {
        from: block.blockContent.beforePos + 1,
        to: block.blockContent.beforePos + 1 + "Hello".length,
      };
    },
    userPrompt: "translate to German",
  },
  {
    editor: getTestEditor,
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
    userPrompt: "make the first paragraph a heading",
  },
  {
    editor: getTestEditor,
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
    userPrompt: "make the first paragraph right aligned",
    requiredCapabilities: {
      textAlignment: true,
    },
  },
  {
    editor: getTestEditor,
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
    userPrompt:
      "make the first paragraph a heading and update the content to 'What's up, world!'",
  },
  {
    editor: getTestEditor,
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
    userPrompt:
      "make the first paragraph right aligned and update the content to 'What's up, world!'",
    requiredCapabilities: {
      textAlignment: true,
    },
  },
  {
    editor: getTestEditor,
    description: "styles + ic in source block, replace content",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [{ type: "text", text: "Hello, updated content", styles: {} }],
      },
    },
    userPrompt:
      "update the content of the second block to 'Hello, updated content'",
  },
  {
    editor: getTestEditor,
    description: "styles + ic in source block, update text",
    updateOp: {
      type: "update",
      id: "ref2",
      block: {
        content: [
          {
            type: "text",
            text: "Hallo, ",
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
            text: "! Wie ",
            styles: {},
          },
          {
            type: "text",
            text: "geht es dir? ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "Ich fühle mich blau!",
            styles: {
              textColor: "blue",
            },
          },
        ],
      },
    },
    userPrompt: "translate the second block to german",
  },
  {
    editor: getTestEditor,
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
            text: "! How are you doing? ",
            styles: {},
          },
          {
            type: "text",
            text: "I'm feeling blue!",
            styles: {
              textColor: "blue",
            },
          },
        ],
      },
    },
    userPrompt: "remove the bold style from the second block",
  },
  {
    editor: getTestEditor,
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
            text: "are you doing? ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "I'm feeling blue!",
            styles: {
              textColor: "blue",
            },
          },
        ],
      },
    },
    userPrompt:
      "change to say 'Hello! How are you doing? I'm feeling blue!' (remove mention but keep bold text)",
  },
  {
    editor: getTestEditor,
    description: "styles + ic in target block, add mark (word)",
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
    userPrompt: "make 'world!' (in the first block) bold",
  },
  {
    editor: getTestEditor,
    description: "styles + ic in target block, add mark (paragraph)",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: [
          {
            type: "text",
            text: "Hello, world!",
            styles: {
              bold: true,
            },
          },
        ],
      },
    },
    userPrompt: "make first paragraph bold",
  },
  {
    editor: getTestEditor,
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
    userPrompt:
      "Change the first paragraph to Hello, Jane Doe! (use a mention)",
    requiredCapabilities: {
      mentions: true,
    },
  },
  {
    editor: getTestEditor,
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
            text: "are you doing? ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "I'm feeling blue!",
            styles: {
              textColor: "blue",
            },
          },
        ],
      },
    },
    userPrompt: "update the mention to Jane Doe",
    requiredCapabilities: {
      mentions: true,
    },
  },
  {
    editor: getTestEditor,
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
    userPrompt:
      "remove the formatting (turn into plain text without styles or urls) from the last paragraph",
  },
  {
    editor: getTestEditor,
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
    userPrompt:
      "change the last paragraph to 'Hi, world! Bold the text. Link.' without any markup like bold or link",
  },
  {
    editor: getTableTestEditor,
    description: "update table cell",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Hello, world!", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "Table Cell 6",
              ],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
            },
          ],
        },
      },
    },
    userPrompt: "update the first cell to 'Hello, world!'",
  },
  {
    editor: getTableTestEditor,
    description: "update table to caps",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["TABLE CELL 1", "TABLE CELL 2", "TABLE CELL 3"],
            },
            {
              cells: [
                "TABLE CELL 4",
                [
                  {
                    type: "text",
                    text: "TABLE CELL BOLD 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "TABLE CELL 6",
              ],
            },
            {
              cells: ["TABLE CELL 7", "TABLE CELL 8", "TABLE CELL 9"],
            },
          ],
        },
      },
    },
    userPrompt: "update all table content to CAPS",
  },
  {
    editor: getTableTestEditor,
    description: "remove column",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 3"],
            },
            {
              cells: ["Table Cell 4", "Table Cell 6"],
            },
            {
              cells: ["Table Cell 7", "Table Cell 9"],
            },
          ],
        },
      },
    },
    userPrompt: "Remove the second column",
  },
  {
    editor: getTableTestEditor,
    description: "remove last column",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
              ],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8"],
            },
          ],
        },
      },
    },
    userPrompt: "Remove the last column",
  },
  {
    editor: getTableTestEditor,
    description: "remove row",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
            },
          ],
        },
      },
    },
    userPrompt: "Remove the second row",
  },
  {
    editor: getTableTestEditor,
    description: "remove last row",
    updateOp: {
      type: "update",
      id: "ref1",
      block: {
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "Table Cell 6",
              ],
            },
          ],
        },
      },
    },
    userPrompt: "Remove the last row",
  },
];
