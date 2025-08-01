import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
import { CSSProperties } from "react";

// Define the styles interface for configurable style transformations
// This can be extended in the future to allow customizing style transformations
export type ReactEmailStyleTransformStyles = Record<string, never>;

// Default styles for style transformations
export const defaultReactEmailStyleTransformStyles: ReactEmailStyleTransformStyles =
  {};

export const createReactEmailStyleMappingForDefaultSchema = (
  _styleTransformStyles: ReactEmailStyleTransformStyles = defaultReactEmailStyleTransformStyles,
): StyleMapping<DefaultStyleSchema, CSSProperties> => ({
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
});

// Export the original mapping for backward compatibility
export const reactEmailStyleMappingForDefaultSchema =
  createReactEmailStyleMappingForDefaultSchema();
