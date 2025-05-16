import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";

export const odtInlineContentMappingForDefaultSchema: InlineContentMapping<
  DefaultInlineContentSchema,
  any,
  React.JSX.Element,
  React.JSX.Element
> = {
  link: (ic, exporter) => {
    const content = ic.content.map((c) => exporter.transformStyledText(c));

    return (
      <text:a
        xlink:type="simple"
        text:style-name="Internet_20_link"
        office:target-frame-name="_top"
        xlink:show="replace"
        xlink:href={ic.href}
      >
        {content}
      </text:a>
    );
  },

  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
};
