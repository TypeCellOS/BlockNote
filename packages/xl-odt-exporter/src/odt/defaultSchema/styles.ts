import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
export const odtStyleMappingForDefaultSchema: StyleMapping<
  DefaultStyleSchema,
  Record<string, string>
> = {
  bold: (val) => {
    if (!val) return {};
    return { "fo:font-weight": "bold" };
  },

  italic: (val) => {
    if (!val) return {};
    return { "fo:font-style": "italic" };
  },

  underline: (val) => {
    if (!val) return {};
    return { "style:text-underline-style": "solid" };
  },

  strike: (val) => {
    if (!val) return {};
    return { "style:text-line-through-style": "solid" };
  },

  textColor: (val, exporter) => {
    if (!val) return {};
    const color =
      exporter.options.colors[val as keyof typeof exporter.options.colors].text;
    return { "fo:color": color };
  },

  backgroundColor: (val, exporter) => {
    if (!val) return {};
    const color =
      exporter.options.colors[val as keyof typeof exporter.options.colors]
        .background;
    return { "fo:background-color": color };
  },

  code: (val) => {
    if (!val) return {};
    return { "style:font-name": "Courier New" };
  },
};
