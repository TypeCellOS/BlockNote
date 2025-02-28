import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
export const odtStyleMappingForDefaultSchema: StyleMapping<
  DefaultStyleSchema,
  Record<string, string>
> = {
  bold: (val): Record<string, string> => {
    if (!val) {
      return {};
    }
    return { "fo:font-weight": "bold" };
  },

  italic: (val): Record<string, string> => {
    if (!val) {
      return {};
    }
    return { "fo:font-style": "italic" };
  },

  underline: (val): Record<string, string> => {
    if (!val) {
      return {};
    }
    return { "style:text-underline-style": "solid" };
  },

  strike: (val): Record<string, string> => {
    if (!val) {
      return {};
    }
    return { "style:text-line-through-style": "solid" };
  },

  textColor: (val, exporter): Record<string, string> => {
    if (!val) {
      return {};
    }
    const color =
      exporter.options.colors[val as keyof typeof exporter.options.colors].text;
    return { "fo:color": color };
  },

  backgroundColor: (val, exporter): Record<string, string> => {
    if (!val) {
      return {};
    }
    const color =
      exporter.options.colors[val as keyof typeof exporter.options.colors]
        .background;
    return { "fo:background-color": color };
  },

  code: (val): Record<string, string> => {
    if (!val) {
      return {};
    }
    return { "style:font-name": "Courier New" };
  },
};
