import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
import { IRunPropertiesOptions } from "docx";

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
    return {
      shading: {
        fill: exporter.options.colors[
          val as keyof typeof exporter.options.colors
        ].background.slice(1),
      },
    };
  },
  textColor: (val, exporter) => {
    if (!val) {
      return {};
    }
    return {
      color:
        exporter.options.colors[
          val as keyof typeof exporter.options.colors
        ].text.slice(1),
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      font: "GeistMono",
    };
  },
};
