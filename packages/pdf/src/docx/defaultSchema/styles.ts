import { DefaultStyleSchema } from "@blocknote/core";
import { IRunPropertiesOptions } from "docx";
import { StyleMapping } from "../../mapping.js";

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
  backgroundColor: (val) => {
    if (!val || val === "default") {
      return {};
    }
    return {
      shading: {
        fill: "00ff00", // TODO
      },
    };
  },
  textColor: (val) => {
    if (!val || val === "default") {
      return {};
    }
    return {
      color: "dd0000", // TODO
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      font: "Courier New",
    };
  },
};
