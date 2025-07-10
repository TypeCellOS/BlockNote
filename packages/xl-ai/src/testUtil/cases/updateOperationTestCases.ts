import { BlockNoteEditor, getBlockInfo, getNodeById } from "@blocknote/core";
import { createAIExtension } from "../../AIExtension.js";
import { getEditorWithBlockFormatting } from "./editors/blockFormatting.js";
import { getEditorWithFormattingAndMentions } from "./editors/formattingAndMentions.js";
import { DocumentOperationTestCase } from "./index.js";
import { schemaWithMention as schema } from "./schemas/mention.js";

/**
 * This file defines a set of test cases that can be used to test update operations to the editor.
 * It focuses on formatting related operations (like changing styles, inline content, props, etc)
 */

export const updateOperationTestCases: DocumentOperationTestCase[] = [
  {
    editor: getEditorWithFormattingAndMentions,
    description: "standard update",
    baseToolCalls: [
      {
        type: "update",
        id: "ref1",
        block: {
          content: [{ type: "text", text: "Hallo, Welt!", styles: {} }],
        },
      },
    ],
    userPrompt: "translate the first paragraph to german",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "translate selection",
    baseToolCalls: [
      {
        type: "update",
        id: "ref2",
        block: {
          content: [{ type: "text", text: "Hallo", styles: {} }],
        },
      },
    ],
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
    editor: getEditorWithFormattingAndMentions,
    description: "update block type",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "make the first paragraph a heading",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "update block prop",
    baseToolCalls: [
      {
        type: "update",
        id: "ref1",
        block: {
          props: {
            textAlignment: "right",
          },
        },
      },
    ],
    userPrompt: "make the first paragraph right aligned",
    requiredCapabilities: {
      textAlignment: true,
    },
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "update block type and content",
    baseToolCalls: [
      {
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
    ],
    userPrompt:
      "make the first paragraph a heading and update the content to 'What's up, world!'",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "update block prop and content",
    baseToolCalls: [
      {
        type: "update",
        id: "ref1",
        block: {
          props: {
            textAlignment: "right",
          },
          content: [{ type: "text", text: "What's up, world!", styles: {} }],
        },
      },
    ],
    userPrompt:
      "make the first paragraph right aligned and update the content to 'What's up, world!'",
    requiredCapabilities: {
      textAlignment: true,
    },
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in source block, replace content",
    baseToolCalls: [
      {
        type: "update",
        id: "ref2",
        block: {
          content: [
            { type: "text", text: "Hello, updated content", styles: {} },
          ],
        },
      },
    ],
    userPrompt:
      "update the content of the second block to 'Hello, updated content'",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in source block, update text",
    baseToolCalls: [
      {
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
              text: "! ",
              styles: {},
            },
            {
              type: "text",
              text: "Wie geht es dir?",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " ",
              styles: {},
            },
            {
              type: "text",
              text: "Dieser Text ist blau!",
              styles: {
                textColor: "blue",
              },
            },
          ],
        },
      },
    ],
    userPrompt:
      "translate the second block including the greeting to German (use dir instead of Ihnen)",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in source block, remove mark",
    baseToolCalls: [
      {
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
            {
              type: "text",
              text: " ",
            },
            {
              type: "text",
              text: "This text is blue!",
              styles: {
                textColor: "blue",
              },
            },
          ],
        },
      },
    ],
    userPrompt: "remove the bold style from the second block",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in source block, remove mention",
    baseToolCalls: [
      {
        type: "update",
        id: "ref2",
        block: {
          content: [
            {
              type: "text",
              text: "Hello! ",
              styles: {},
            },
            {
              type: "text",
              text: "How are you doing?",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " ",
            },
            {
              type: "text",
              text: "This text is blue!",
              styles: {
                textColor: "blue",
              },
            },
          ],
        },
      },
    ],
    userPrompt:
      "change to say 'Hello! How are you doing? This text is blue!' (remove mention but keep bold text)",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in target block, add mark (word)",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "make 'world!' (in the first block) bold",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in target block, add mark (paragraph)",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "make first paragraph bold",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "plain source block, add mention",
    baseToolCalls: [
      {
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
    ],
    userPrompt:
      "Change the first paragraph to Hello, Jane Doe! (use a mention)",
    requiredCapabilities: {
      mentions: true,
    },
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "styles + ic in source block, update mention prop",
    baseToolCalls: [
      {
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
              text: "! ",
            },
            {
              type: "text",
              text: "How are you doing?",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: " ",
            },
            {
              type: "text",
              text: "This text is blue!",
              styles: {
                textColor: "blue",
              },
            },
          ],
        },
      },
    ],
    userPrompt: "update the mention to Jane Doe",
    requiredCapabilities: {
      mentions: true,
    },
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "drop mark and link",
    baseToolCalls: [
      {
        type: "update",
        id: "ref3",
        block: {
          content: [
            {
              type: "text",
              text: "Hello, world! Bold text. Link.",
              styles: {},
            },
          ],
        },
      },
    ],
    userPrompt:
      "remove the formatting (turn into plain text without styles or urls) from the last paragraph",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "drop mark and link and change text within mark",
    baseToolCalls: [
      {
        type: "update",
        id: "ref3",
        block: {
          content: [
            {
              type: "text",
              text: "Hi, world! Bold the text. Link.",
              styles: {},
            },
          ],
        },
      },
    ],
    userPrompt:
      "change the last paragraph to 'Hi, world! Bold the text. Link.' without any markup like bold or link",
  },
  /*{
    editor: getEditorWithTables,
    description: "update table cell",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "update the first cell to 'Hello, world!'",
  },
  {
    editor: getEditorWithTables,
    description: "update table to caps",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "update all table content to CAPS",
  },
  {
    editor: getEditorWithTables,
    description: "remove column",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "Remove the second column",
  },
  {
    editor: getEditorWithTables,
    description: "remove last column",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "Remove the last column",
  },
  {
    editor: getEditorWithTables,
    description: "remove row",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "Remove the second row",
  },
  {
    editor: getEditorWithTables,
    description: "remove last row",
    baseToolCalls: [
      {
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
    ],
    userPrompt: "Remove the last row",
  },*/
  {
    editor: () => {
      const editor = BlockNoteEditor.create({
        trailingBlock: false,
        initialContent: [
          {
            id: "ref1",
            type: "paragraph",
            content: [{ type: "text", text: "I need to buy:", styles: {} }],
          },
          {
            id: "ref2",
            type: "paragraph",
            content: [{ type: "text", text: "Apples", styles: {} }],
          },
          {
            id: "ref3",
            type: "paragraph",
            content: [{ type: "text", text: "Bananas", styles: {} }],
          },
        ],
        schema,
        extensions: [
          createAIExtension({
            model: undefined as any,
          }),
        ],
      });
      return editor;
    },
    description: "turn paragraphs into list",
    baseToolCalls: [
      {
        type: "update",
        id: "ref2",
        block: {
          type: "bulletListItem",
        },
      },
      {
        type: "update",
        id: "ref3",
        block: {
          type: "bulletListItem",
        },
      },
    ],
    userPrompt: "turn into list (update existing blocks)",
    getTestSelection(editor) {
      const posInfo = getNodeById("ref2", editor.prosemirrorState.doc)!;
      const block = getBlockInfo(posInfo);
      if (!block.isBlockContainer) {
        throw new Error("Block is not a block container");
      }
      return {
        from: block.blockContent.beforePos + 1,
        to: editor.prosemirrorState.doc.content.size,
      };
    },
  },
  {
    editor: () => {
      const editor = BlockNoteEditor.create({
        trailingBlock: false,
        initialContent: [
          {
            id: "ref1",
            type: "paragraph",
            content: [{ type: "text", text: "I need to buy:", styles: {} }],
            children: [
              {
                id: "ref2",
                type: "paragraph",
                content: [{ type: "text", text: "Apples", styles: {} }],
              },
            ],
          },
        ],
        schema,
        extensions: [
          createAIExtension({
            model: undefined as any,
          }),
        ],
      });
      return editor;
    },
    description: "modify nested content",
    baseToolCalls: [
      {
        type: "update",
        id: "ref2",
        block: {
          content: [{ type: "text", text: "APPLES", styles: {} }],
        },
      },
    ],
    userPrompt: "make apples uppercase",
  },
  {
    editor: () => {
      const editor = BlockNoteEditor.create({
        trailingBlock: false,
        initialContent: [
          {
            id: "ref1",
            type: "paragraph",
            content: [{ type: "text", text: "I need to buy:", styles: {} }],
            children: [
              {
                id: "ref2",
                type: "paragraph",
                content: [{ type: "text", text: "Apples", styles: {} }],
              },
            ],
          },
        ],
        schema,
        extensions: [
          createAIExtension({
            model: undefined as any,
          }),
        ],
      });
      return editor;
    },
    description: "modify parent content",
    baseToolCalls: [
      {
        type: "update",
        id: "ref1",
        block: {
          content: [{ type: "text", text: "I NEED TO BUY:", styles: {} }],
        },
      },
    ],
    userPrompt: "make the first paragraph uppercase",
  },
  {
    editor: getEditorWithBlockFormatting,
    description: "clear block formatting",
    baseToolCalls: [
      {
        type: "update",
        id: "ref1",
        block: {
          props: {
            backgroundColor: undefined,
            textAlignment: undefined,
          },
        },
      },
      {
        type: "update",
        id: "ref2",
        block: {
          props: {
            backgroundColor: undefined,
            textAlignment: undefined,
          },
        },
      },
    ],
    userPrompt: "clear the formatting (colors and alignment)",
    requiredCapabilities: {
      blockColor: true,
    },
  },
];
