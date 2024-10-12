import { DefaultStyleSchema } from "@blocknote/core";
import { IRunPropertiesOptions } from "docx";
import { StyleMapping } from "../../mapping.js";

export const docxStyleMappingForDefaultSchema = {
  bold: (val) => {
    return {
      bold: val,
    };
  },
  italic: (val) => {
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
    if (!val) {
      return {};
    }
    return {
      // highlight: val,
    };
  },
  textColor: (val) => {
    if (!val) {
      return {};
    }
    return {
      // color: val,
    };
  },
  code: (val) => {
    if (!val) {
      return {};
    }
    return {
      // TODO
      // font: "",
    };
  },
} satisfies StyleMapping<DefaultStyleSchema, IRunPropertiesOptions>;
