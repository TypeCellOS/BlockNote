import {
  DefaultInlineContentSchema,
  InlineContentMapping,
} from "@blocknote/core";
import { Fragment } from "react";

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
    const content = ic.content.map((c, index) => (
      <Fragment key={index}>{exporter.transformStyledText(c)}</Fragment>
    ));

    return (
      <text:a
        xlinkType="simple"
        text:style-name="Internet_20_link"
        office:target-frame-name="_top"
        xlinkShow="replace"
        xlinkHref={ic.href}
      >
        {content}
      </text:a>
    );
  },

  text: (ic, exporter) => {
    return exporter.transformStyledText(ic);
  },
};
