import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Block, BlockNoteEditor } from "../..";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { DefaultBlockSchema } from "../../extensions/Blocks/api/defaultBlocks";

let editor: BlockNoteEditor;

let nonNestedBlocks: Block<DefaultBlockSchema>[];
let nonNestedHTML: string;
let nonNestedMarkdown: string;

let nestedBlocks: Block<DefaultBlockSchema>[];
// let nestedHTML: string;
// let nestedMarkdown: string;

let styledBlocks: Block<DefaultBlockSchema>[];
let styledHTML: string;
let styledMarkdown: string;

let complexBlocks: Block<DefaultBlockSchema>[];
// let complexHTML: string;
// let complexMarkdown: string;

function removeInlineContentClass(html: string) {
  return html.replace(/ class="_inlineContent_1c48ad"/g, "");
}

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS = {};

  editor = new BlockNoteEditor();

  nonNestedBlocks = [
    {
      id: UniqueID.options.generateID(),
      type: "heading",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        level: "1",
      },
      content: [
        {
          type: "text",
          text: "Heading",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Paragraph",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "bulletListItem",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Bullet List Item",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "numberedListItem",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Numbered List Item",
          styles: {},
        },
      ],
      children: [],
    },
  ];
  nonNestedHTML = `<h1>Heading</h1><p>Paragraph</p><ul><li><p>Bullet List Item</p></li></ul><ol><li><p>Numbered List Item</p></li></ol>`;
  nonNestedMarkdown = `# Heading

Paragraph

*   Bullet List Item

1.  Numbered List Item
`;

  nestedBlocks = [
    {
      id: UniqueID.options.generateID(),
      type: "heading",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        level: "1",
      },
      content: [
        {
          type: "text",
          text: "Heading",
          styles: {},
        },
      ],
      children: [
        {
          id: UniqueID.options.generateID(),
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Paragraph",
              styles: {},
            },
          ],
          children: [
            {
              id: UniqueID.options.generateID(),
              type: "bulletListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Bullet List Item",
                  styles: {},
                },
              ],
              children: [
                {
                  id: UniqueID.options.generateID(),
                  type: "numberedListItem",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                  content: [
                    {
                      type: "text",
                      text: "Numbered List Item",
                      styles: {},
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
  // nestedHTML = `<h1>Heading</h1><p>Paragraph</p><ul><li><p>Bullet List Item</p><ol><li><p>Numbered List Item</p></li></ol></li></ul>`;
  // nestedMarkdown = `# Heading
  //
  // Paragraph
  //
  // *   Bullet List Item
  //
  //     1.  Numbered List Item
  // `;

  styledBlocks = [
    {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Bold",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "Italic",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: "Underline",
          styles: {
            underline: true,
          },
        },
        {
          type: "text",
          text: "Strikethrough",
          styles: {
            strike: true,
          },
        },
        {
          type: "text",
          text: "TextColor",
          styles: {
            textColor: "red",
          },
        },
        {
          type: "text",
          text: "BackgroundColor",
          styles: {
            backgroundColor: "red",
          },
        },
        {
          type: "text",
          text: "Multiple",
          styles: {
            bold: true,
            italic: true,
          },
        },
      ],
      children: [],
    },
  ];
  styledHTML = `<p><strong>Bold</strong><em>Italic</em><u>Underline</u><s>Strikethrough</s><span data-text-color="red">TextColor</span><span data-background-color="red">BackgroundColor</span><strong><em>Multiple</em></strong></p>`;
  styledMarkdown = `**Bold***Italic*Underline~~Strikethrough~~TextColorBackgroundColor***Multiple***`;

  complexBlocks = [
    {
      id: UniqueID.options.generateID(),
      type: "heading",
      props: {
        backgroundColor: "red",
        textColor: "yellow",
        textAlignment: "right",
        level: "1",
      },
      content: [
        {
          type: "text",
          text: "Heading 1",
          styles: {},
        },
      ],
      children: [
        {
          id: UniqueID.options.generateID(),
          type: "heading",
          props: {
            backgroundColor: "orange",
            textColor: "orange",
            textAlignment: "center",
            level: "2",
          },
          content: [
            {
              type: "text",
              text: "Heading 2",
              styles: {},
            },
          ],
          children: [
            {
              id: UniqueID.options.generateID(),
              type: "heading",
              props: {
                backgroundColor: "yellow",
                textColor: "red",
                textAlignment: "left",
                level: "3",
              },
              content: [
                {
                  type: "text",
                  text: "Heading 3",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Paragraph",
          styles: {
            textColor: "purple",
            backgroundColor: "green",
          },
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "P",
          styles: {},
        },
        {
          type: "text",
          text: "ara",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "grap",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: "h",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "P",
          styles: {},
        },
        {
          type: "text",
          text: "ara",
          styles: {
            underline: true,
          },
        },
        {
          type: "text",
          text: "grap",
          styles: {
            strike: true,
          },
        },
        {
          type: "text",
          text: "h",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "bulletListItem",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Bullet List Item",
          styles: {},
        },
      ],
      children: [],
    },
    {
      id: UniqueID.options.generateID(),
      type: "bulletListItem",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Bullet List Item",
          styles: {},
        },
      ],
      children: [
        {
          id: UniqueID.options.generateID(),
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Bullet List Item",
              styles: {},
            },
          ],
          children: [
            {
              id: UniqueID.options.generateID(),
              type: "bulletListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Bullet List Item",
                  styles: {},
                },
              ],
              children: [],
            },
            {
              id: UniqueID.options.generateID(),
              type: "paragraph",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Paragraph",
                  styles: {},
                },
              ],
              children: [],
            },
            {
              id: UniqueID.options.generateID(),
              type: "numberedListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Numbered List Item",
                  styles: {},
                },
              ],
              children: [],
            },
            {
              id: UniqueID.options.generateID(),
              type: "numberedListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Numbered List Item",
                  styles: {},
                },
              ],
              children: [],
            },
            {
              id: UniqueID.options.generateID(),
              type: "numberedListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Numbered List Item",
                  styles: {},
                },
              ],
              children: [
                {
                  id: UniqueID.options.generateID(),
                  type: "numberedListItem",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                  content: [
                    {
                      type: "text",
                      text: "Numbered List Item",
                      styles: {},
                    },
                  ],
                  children: [],
                },
              ],
            },
            {
              id: UniqueID.options.generateID(),
              type: "bulletListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Bullet List Item",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
        {
          id: UniqueID.options.generateID(),
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Bullet List Item",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
    {
      id: UniqueID.options.generateID(),
      type: "bulletListItem",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: "Bullet List Item",
          styles: {},
        },
      ],
      children: [],
    },
  ];

  // complexHTML = `<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><p><span data-text-color="purple"><span data-background-color="green">Paragraph</span></span></p><p>P<strong>ara</strong><em>grap</em>h</p><p>P<u>ara</u><s>grap</s>h</p><ul><li><p>Bullet List Item</p></li><li><p>Bullet List Item</p><ul><li><p>Bullet List Item</p><ul><li><p>Bullet List Item</p></li></ul><p>Paragraph</p><ol><li><p>Numbered List Item</p></li><li><p>Numbered List Item</p></li><li><p>Numbered List Item</p><ol><li><p>Numbered List Item</p></li></ol></li></ol><ul><li><p>Bullet List Item</p></li></ul></li><li><p>Bullet List Item</p></li></ul></li><li><p>Bullet List Item</p></li></ul>`;
  // complexMarkdown = `# Heading 1
  //
  // ## Heading 2
  //
  // ### Heading 3
  //
  // Paragraph
  //
  // P**ara***grap*h
  //
  // P*ara*~~grap~~h
  //
  // *   Bullet List Item
  //
  // *   Bullet List Item
  //
  //     *   Bullet List Item
  //
  //         *   Bullet List Item
  //
  //         Paragraph
  //
  //         1.  Numbered List Item
  //
  //         2.  Numbered List Item
  //
  //         3.  Numbered List Item
  //
  //             1.  Numbered List Item
  //
  //         *   Bullet List Item
  //
  //     *   Bullet List Item
  //
  // *   Bullet List Item
  // `;
});

afterEach(() => {
  editor._tiptapEditor.destroy();
  editor = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS;
});

describe("Non-Nested Block/HTML/Markdown Conversions", () => {
  it("Convert non-nested blocks to HTML", async () => {
    const output = await editor.blocksToHTML(nonNestedBlocks);

    expect(removeInlineContentClass(output)).toMatchSnapshot();
  });

  it("Convert non-nested blocks to Markdown", async () => {
    const output = await editor.blocksToMarkdown(nonNestedBlocks);

    expect(output).toMatchSnapshot();
  });

  it("Convert non-nested HTML to blocks", async () => {
    const output = await editor.HTMLToBlocks(nonNestedHTML);

    expect(output).toMatchSnapshot();
  });

  it("Convert non-nested Markdown to blocks", async () => {
    const output = await editor.markdownToBlocks(nonNestedMarkdown);

    expect(output).toMatchSnapshot();
  });
});

describe("Nested Block/HTML/Markdown Conversions", () => {
  it("Convert nested blocks to HTML", async () => {
    const output = await editor.blocksToHTML(nestedBlocks);

    expect(removeInlineContentClass(output)).toMatchSnapshot();
  });

  it("Convert nested blocks to Markdown", async () => {
    const output = await editor.blocksToMarkdown(nestedBlocks);

    expect(output).toMatchSnapshot();
  });
  // // Failing due to nested block parsing bug.
  // it("Convert nested HTML to blocks", async () => {
  //   const output = await editor.HTMLToBlocks(nestedHTML);
  //
  //   expect(output).toMatchSnapshot();
  // });
  // // Failing due to nested block parsing bug.
  // it("Convert nested Markdown to blocks", async () => {
  //   const output = await editor.markdownToBlocks(nestedMarkdown);
  //
  //   expect(output).toMatchSnapshot();
  // });
});

describe("Styled Block/HTML/Markdown Conversions", () => {
  it("Convert styled blocks to HTML", async () => {
    const output = await editor.blocksToHTML(styledBlocks);

    expect(removeInlineContentClass(output)).toMatchSnapshot();
  });

  it("Convert styled blocks to Markdown", async () => {
    const output = await editor.blocksToMarkdown(styledBlocks);

    expect(output).toMatchSnapshot();
  });

  it("Convert styled HTML to blocks", async () => {
    const output = await editor.HTMLToBlocks(styledHTML);

    expect(output).toMatchSnapshot();
  });

  it("Convert styled Markdown to blocks", async () => {
    const output = await editor.markdownToBlocks(styledMarkdown);

    expect(output).toMatchSnapshot();
  });
});

describe("Complex Block/HTML/Markdown Conversions", () => {
  it("Convert complex blocks to HTML", async () => {
    const output = await editor.blocksToHTML(complexBlocks);

    expect(removeInlineContentClass(output)).toMatchSnapshot();
  });

  it("Convert complex blocks to Markdown", async () => {
    const output = await editor.blocksToMarkdown(complexBlocks);

    expect(output).toMatchSnapshot();
  });
  // // Failing due to nested block parsing bug.
  // it("Convert complex HTML to blocks", async () => {
  //   const output = await editor.HTMLToBlocks(complexHTML);
  //
  //   expect(output).toMatchSnapshot();
  // });
  // // Failing due to nested block parsing bug.
  // it("Convert complex Markdown to blocks", async () => {
  //   const output = await editor.markdownToBlocks(complexMarkdown);
  //
  //   expect(output).toMatchSnapshot();
  // });
});
