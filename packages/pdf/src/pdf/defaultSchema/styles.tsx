import { DefaultStyleSchema } from "@blocknote/core";
import { TextProps } from "@react-pdf/renderer";
import { StyleMapping } from "../../mapping";

export const pdfStyleMappingForDefaultSchema = {
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
  backgroundColor: (val) => {
    return {
      backgroundColor: val,
    };
  },
  textColor: (val) => {
    if (!val) {
      return {};
    }
    return {
      color: val,
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      fontFamily: "Courier",
    };
  },
} satisfies StyleMapping<DefaultStyleSchema, TextProps["style"]>;
