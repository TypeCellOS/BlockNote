import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
import { IRunPropertiesOptions, ShadingType } from "docx";

export const docxStyleMappingForDefaultSchema: StyleMapping<
  DefaultStyleSchema,
  IRunPropertiesOptions
> = {
  bold: (val) => {
    if (!val) {
      return {};
    }
    return {
      bold: val,
    };
  },
  italic: (val) => {
    if (!val) {
      return {};
    }
    return {
      italics: val,
    };
  },
  underline: (val) => {
    if (!val) {
      return {};
    }
    return {
      underline: {
        type: "single",
      },
    };
  },
  strike: (val) => {
    if (!val) {
      return {};
    }
    return {
      strike: val,
    };
  },
  backgroundColor: (val, exporter) => {
    if (!val) {
      return {};
    }
    const color = exporter.options.colors[val]?.background;
    if (!color) {
      return {};
    }
    return {
      shading: {
        type: ShadingType.CLEAR,
        fill: color.slice(1),
      },
    };
  },
  textColor: (val, exporter) => {
    if (!val) {
      return {};
    }
    const color = exporter.options.colors[val]?.text;
    if (!color) {
      return {};
    }
    return {
      color: color.slice(1),
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      style: "VerbatimChar"
    };
  },
};
