import { BlockNoteSchema } from "@blocknote/core";
import {
  CheckBox,
  Paragraph,
  ParagraphChild,
  Tab,
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

  return mappingFactory(BlockNoteSchema.create()).createBlockMapping<Paragraph>(
    {
      paragraph: (block) => {
        return new Paragraph({
          children: [
            // new TextRun({
            //   children: [new Tab(), "John Doe"],
            // }),
            ...createContent(block.content),
          ],
          // tabStops: [
          //   {
          //     position: 2268,
          //     type: TabStopType.LEFT,
          //   },
          // ],
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
            new Tab(),
            new TextRun({
              text: block.type + " not implemented",
            }),
          ],
          tabStops: [
            {
              position: 2268,
              type: TabStopType.LEFT,
            },
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
