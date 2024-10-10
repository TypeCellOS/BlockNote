import { BlockNoteSchema } from "@blocknote/core";
import {
  CheckBox,
  Paragraph,
  ParagraphChild,
  TabStopType,
  TextRun,
} from "docx";
import { mappingFactory } from "../mapping";

export function docxBlockMappingForDefaultSchema(
  inlineContentTransformer: (
    inlineContent: any // TODO
  ) => ParagraphChild
) {
  function createContent<T>(content: T[]): ParagraphChild[] {
    return content.map((content) => {
      return inlineContentTransformer(content);
    });
  }

  function createTabStops(nestingLevel: number): any[] {
    const tabStops: any[] = [];
    for (let i = 0; i < Math.min(nestingLevel, 5); i++) {
      // create min. 5 tabstops
      tabStops.push({
        position: 200 * (i + 1),
        type: TabStopType.LEFT,
      });
    }
    return tabStops;
  }

  return mappingFactory(BlockNoteSchema.create()).createBlockMapping<Paragraph>(
    {
      paragraph: (block, nestingLevel) => {
        return new Paragraph({
          children: createContent(block.content),
          style: "Normal",
          tabStops: createTabStops(nestingLevel),
        });
      },
      numberedListItem: (block) => {
        return new Paragraph({
          children: createContent(block.content),
          numbering: {
            reference: "blocknote-numbering",
            level: 0,
          },
        });
      },
      bulletListItem: (block) => {
        return new Paragraph({
          children: createContent(block.content),
          bullet: {
            level: 0,
          },
        });
      },
      checkListItem: (block) => {
        return new Paragraph({
          children: [
            new CheckBox({ checked: block.props.checked }),
            ...createContent(block.content),
          ],
          bullet: {
            level: 0,
          },
        });
      },
      heading: (block) => {
        return new Paragraph({
          children: createContent(block.content),
          heading: `Heading${block.props.level}`,
        });
      },
      audio: (block) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
        });
      },
      video: (block) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
        });
      },
      file: (block) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
        });
      },
      image: (block) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
        });
      },
      table: (block) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
        });
      },
    }
  );
}
