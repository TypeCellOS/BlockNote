import { ExternalHyperlink, Paragraph, TextRun } from "docx";
import { sourceContent, type SourceBlock } from "../exporters/sourceContent.js";

function sourceBlockMapping(block: SourceBlock) {
  const { label, description, source, href } = sourceContent(block);
  const paragraphs = [
    new Paragraph({
      children: [
        href
          ? new ExternalHyperlink({
              link: href,
              children: [new TextRun({ text: label, style: "Hyperlink" })],
            })
          : new TextRun(label),
      ],
    }),
  ];
  if (description) {
    paragraphs.push(new Paragraph({ children: [new TextRun(description)] }));
  }
  if (source && source !== label) {
    paragraphs.push(
      new Paragraph({
        children: [
          href
            ? new ExternalHyperlink({
                link: href,
                children: [new TextRun({ text: source, style: "Hyperlink" })],
              })
            : new TextRun(source),
        ],
      }),
    );
  }
  return paragraphs;
}

export {
  sourceBlockMapping as bookmarkBlockMapping,
  sourceBlockMapping as embedBlockMapping,
};
