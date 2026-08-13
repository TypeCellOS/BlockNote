import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";

type ICSchema = DefaultInlineContentSchema;

// `React.ReactNode` result types, matching `ODTExporter`'s `Exporter`
// generics - mismatched result types make the mappings unassignable.
export const odtInlineContentMappingForDefaultSchema: InlineContentMapping<
  ICSchema,
  any,
  React.ReactNode,
  React.ReactNode
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
