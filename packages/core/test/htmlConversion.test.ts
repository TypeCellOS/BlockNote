import { assert, describe, it } from "vitest";
import { Block, BlockNoteEditor } from "../src";
import { Editor } from "../src";

const editorAPI = new Editor(new BlockNoteEditor().tiptapEditor);

const blocks: Block[] = [
  {
    id: null,
    type: "heading",
    props: {
      level: "1",
    },
    textContent: "Heading 1",
    styledTextContent: [
      {
        text: "Heading 1",
        styles: [],
      },
    ],
    children: [
      {
        id: null,
        type: "heading",
        props: {
          level: "2",
        },
        textContent: "Heading 2",
        styledTextContent: [
          {
            text: "Heading 2",
            styles: [],
          },
        ],
        children: [
          {
            id: null,
            type: "heading",
            props: {
              level: "3",
            },
            textContent: "Heading 3",
            styledTextContent: [
              {
                text: "Heading 3",
                styles: [],
              },
            ],
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: null,
    type: "paragraph",
    props: {},
    textContent: "Paragraph",
    styledTextContent: [
      {
        text: "Paragraph",
        styles: [
          {
            type: "textColor",
            props: {
              color: "purple",
            },
          },
          {
            type: "backgroundColor",
            props: {
              color: "green",
            },
          },
        ],
      },
    ],
    children: [],
  },
  {
    id: null,
    type: "paragraph",
    props: {},
    textContent: "Paragraph",
    styledTextContent: [
      {
        text: "P",
        styles: [],
      },
      {
        text: "ara",
        styles: [
          {
            type: "bold",
            props: {},
          },
        ],
      },
      {
        text: "grap",
        styles: [
          {
            type: "italic",
            props: {},
          },
        ],
      },
      {
        text: "h",
        styles: [],
      },
    ],
    children: [],
  },
  {
    id: null,
    type: "paragraph",
    props: {},
    textContent: "Paragraph",
    styledTextContent: [
      {
        text: "P",
        styles: [],
      },
      {
        text: "ara",
        styles: [
          {
            type: "underline",
            props: {},
          },
        ],
      },
      {
        text: "grap",
        styles: [
          {
            type: "strike",
            props: {},
          },
        ],
      },
      {
        text: "h",
        styles: [],
      },
    ],
    children: [],
  },
  {
    id: null,
    type: "bulletListItem",
    props: {},
    textContent: "Bullet List Item",
    styledTextContent: [
      {
        text: "Bullet List Item",
        styles: [],
      },
    ],
    children: [],
  },
  {
    id: null,
    type: "bulletListItem",
    props: {},
    textContent: "Bullet List Item",
    styledTextContent: [
      {
        text: "Bullet List Item",
        styles: [],
      },
    ],
    children: [
      {
        id: null,
        type: "bulletListItem",
        props: {},
        textContent: "Bullet List Item",
        styledTextContent: [
          {
            text: "Bullet List Item",
            styles: [],
          },
        ],
        children: [
          {
            id: null,
            type: "bulletListItem",
            props: {},
            textContent: "Bullet List Item",
            styledTextContent: [
              {
                text: "Bullet List Item",
                styles: [],
              },
            ],
            children: [],
          },
          {
            id: null,
            type: "paragraph",
            props: {},
            textContent: "Paragraph",
            styledTextContent: [
              {
                text: "Paragraph",
                styles: [],
              },
            ],
            children: [],
          },
          {
            id: null,
            type: "numberedListItem",
            props: {
              index: "1",
            },
            textContent: "Numbered List Item",
            styledTextContent: [
              {
                text: "Numbered List Item",
                styles: [],
              },
            ],
            children: [],
          },
          {
            id: null,
            type: "numberedListItem",
            props: {
              index: "2",
            },
            textContent: "Numbered List Item",
            styledTextContent: [
              {
                text: "Numbered List Item",
                styles: [],
              },
            ],
            children: [],
          },
          {
            id: null,
            type: "numberedListItem",
            props: {
              index: "3",
            },
            textContent: "Numbered List Item",
            styledTextContent: [
              {
                text: "Numbered List Item",
                styles: [],
              },
            ],
            children: [
              {
                id: null,
                type: "numberedListItem",
                props: {
                  index: "1",
                },
                textContent: "Numbered List Item",
                styledTextContent: [
                  {
                    text: "Numbered List Item",
                    styles: [],
                  },
                ],
                children: [],
              },
            ],
          },
          {
            id: null,
            type: "bulletListItem",
            props: {},
            textContent: "Bullet List Item",
            styledTextContent: [
              {
                text: "Bullet List Item",
                styles: [],
              },
            ],
            children: [],
          },
        ],
      },
      {
        id: null,
        type: "bulletListItem",
        props: {},
        textContent: "Bullet List Item",
        styledTextContent: [
          {
            text: "Bullet List Item",
            styles: [],
          },
        ],
        children: [],
      },
    ],
  },
  {
    id: null,
    type: "bulletListItem",
    props: {},
    textContent: "Bullet List Item",
    styledTextContent: [
      {
        text: "Bullet List Item",
        styles: [],
      },
    ],
    children: [],
  },
  {
    id: null,
    type: "paragraph",
    props: {},
    textContent: "",
    styledTextContent: [],
    children: [],
  },
];

const html: string = `<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><p><span data-text-color="purple"><span data-background-color="green">Paragraph</span></span></p><p>P<strong>ara</strong><em>grap</em>h</p><p>P<u>ara</u><s>grap</s>h</p><ul><li><p>Bullet List Item</p></li><li><p>Bullet List Item</p><ul><li><p>Bullet List Item</p><ul><li><p>Bullet List Item</p></li></ul><p>Paragraph</p><ol><li><p>Numbered List Item</p></li><li><p>Numbered List Item</p></li><li><p>Numbered List Item</p><ol><li><p>Numbered List Item</p></li></ol></li></ol><ul><li><p>Bullet List Item</p></li></ul></li><li><p>Bullet List Item</p></li></ul></li><li><p>Bullet List Item</p></li></ul><p></p>`;

const markdown: string = `# Heading 1

## Heading 2

### Heading 3

Paragraph

P**ara***grap*h

P*ara*~~grap~~h

*   Bullet List Item

*   Bullet List Item

    *   Bullet List Item

        *   Bullet List Item

        Paragraph

        1.  Numbered List Item

        2.  Numbered List Item

        3.  Numbered List Item

            1.  Numbered List Item

        *   Bullet List Item

    *   Bullet List Item

*   Bullet List Item
`;

describe("Block/HTML/Markdown Conversions", () => {
  it("Convert Complex Blocks to HTML", async () => {
    const input = blocks;
    const expectedOutput = html;

    const output = await editorAPI.blocksToHTML(input);

    assert.equal(output, expectedOutput);
  });

  it("Convert Complex Blocks to Markdown", async () => {
    const input = blocks;
    const expectedOutput = markdown;

    const output = await editorAPI.blocksToMarkdown(input);

    assert.equal(output, expectedOutput);
  });

  // Failing due to nested block parsing bug.
  it("Convert Complex HTML to Blocks", async () => {
    const input = html;
    const expectedOutput = blocks;

    const output = await editorAPI.HTMLToBlocks(input);

    assert.equal(output, expectedOutput);
  });

  // Failing due to nested block parsing bug.
  it("Convert Complex Markdown to Blocks", async () => {
    const input = markdown;
    const expectedOutput = blocks;

    const output = await editorAPI.HTMLToBlocks(input);

    assert.equal(output, expectedOutput);
  });
});
