import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { ExternalHyperlink, ParagraphChild, TextRun } from "docx";
import type { DOCXExporter } from "../docxExporter.js";

type ICSchema = DefaultInlineContentSchema & {
  inlineMath: {
    type: "inlineMath";
    propSchema: Record<string, never>;
    content: "plain";
  };
};

export const docxInlineContentMappingForDefaultSchema: InlineContentMapping<
  ICSchema,
  DefaultStyleSchema,
  ParagraphChild,
  TextRun
> = {
  link: (ic, exporter) => {
    return new ExternalHyperlink({
      children: ic.content.map((content) => {
        return (exporter as DOCXExporter<any, any, any>).transformStyledText(
          content,
          true,
        );
      }),
      link: ic.href,
    });
  },
  text: (ic, t) => {
    return t.transformStyledText(ic);
  },
  // Renders inline math as its monospaced LaTeX source.
  // TODO
  inlineMath: (ic) => {
    return new TextRun({
      text: ic.content,
      style: "VerbatimChar",
    });
  },
};
