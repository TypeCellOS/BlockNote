import { Block } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { BlockNoteContext } from "./BlockNoteContext";

describe("Test BlockNoteContext", () => {
  const context = BlockNoteContext.create();
  const blocks: Block<
    (typeof context)["blockSchema"],
    (typeof context)["inlineContentSchema"],
    (typeof context)["styleSchema"]
  >[] = [
    {
      id: "1",
      type: "heading",
      props: {
        backgroundColor: "blue",
        textColor: "yellow",
        textAlignment: "right",
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Heading ",
          styles: {
            bold: true,
            underline: true,
          },
        },
        {
          type: "text",
          text: "2",
          styles: {
            italic: true,
            strike: true,
          },
        },
      ],
      children: [
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "red",
            textAlignment: "left",
            textColor: "default",
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
          id: "3",
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "list item",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
  ];

  it("blocksToHTMLLossy", async () => {
    const html = await context.blocksToHTMLLossy(blocks);
    expect(html).toMatchSnapshot();
  });

  it("blocksToMarkdownLossy", async () => {
    const md = await context.blocksToMarkdownLossy(blocks);
    expect(md).toMatchSnapshot();
  });

  it("blocksToBlockNoteStyleHTML", async () => {
    const html = await context.blocksToBlockNoteStyleHTML(blocks);
    expect(html).toMatchSnapshot();
  });
});
