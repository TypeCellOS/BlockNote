import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
import { TextProps } from "@react-pdf/renderer";

export const pdfStyleMappingForDefaultSchema: StyleMapping<
  DefaultStyleSchema,
  TextProps["style"]
> = {
  bold: (val) => {
    if (!val) {
      return {};
    }
    return {
      fontWeight: "bold",
    };
  },
  italic: (val) => {
    if (!val) {
      return {};
    }
    return {
      fontStyle: "italic",
    };
  },
  underline: (val) => {
    if (!val) {
      return {};
    }
    return {
      textDecoration: "underline", // TODO: could conflict with strike
    };
  },
  strike: (val) => {
    if (!val) {
      return {};
    }
    return {
      textDecoration: "line-through",
    };
  },
  backgroundColor: (val, exporter) => {
    if (!val) {
      return {};
    }
    return {
      backgroundColor:
        exporter.options.colors[val as keyof typeof exporter.options.colors]
          .background,
    };
  },
  textColor: (val, exporter) => {
    if (!val) {
      return {};
    }
    return {
      color:
        exporter.options.colors[val as keyof typeof exporter.options.colors]
          .text,
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      fontFamily: "GeistMono",
    };
  },
};
