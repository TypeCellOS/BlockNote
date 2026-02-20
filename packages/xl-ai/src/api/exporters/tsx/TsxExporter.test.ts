import { describe, expect, it } from "vitest";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { TsxExporter } from "./TsxExporter.js";

describe("TsxExporter", () => {
  const schema = BlockNoteSchema.create({
    blockSpecs: defaultBlockSpecs,
    inlineContentSpecs: defaultInlineContentSpecs,
    styleSpecs: defaultStyleSpecs,
  });
  const exporter = new TsxExporter(schema);

  it("exports a document with nested blocks", async () => {
    const blocks = [
      {
        id: "h1",
        type: "heading",
        props: {
          level: 1,
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [{ type: "text", text: "Title", styles: {} }],
        children: [],
      },
      {
        id: "p1",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          { type: "text", text: "Hello ", styles: {} },
          { type: "text", text: "World", styles: { bold: true } },
        ],
        children: [],
      },
      {
        id: "list1",
        type: "bulletListItem",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [{ type: "text", text: "Item 1", styles: {} }],
        children: [
          {
            id: "sublist1",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [{ type: "text", text: "Sub Item 1", styles: {} }],
            children: [],
          },
        ],
      },
    ] as any;

    const result = await exporter.toTsx(blocks);

    const expected = [
      '<Heading level="1" textAlignment="left" id="h1">Title</Heading>',
      '<Paragraph textAlignment="left" id="p1">Hello <Bold>World</Bold></Paragraph>',
      '<BulletListItem textAlignment="left" id="list1">Item 1<BulletListItem textAlignment="left" id="sublist1">Sub Item 1</BulletListItem></BulletListItem>',
    ].join("\n");

    expect(result).toBe(expected);
  });
});
