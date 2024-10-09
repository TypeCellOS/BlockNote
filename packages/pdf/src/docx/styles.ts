import { BlockNoteSchema, StyleSchema, StyledText } from "@blocknote/core";
import { IRunPropertiesOptions, TextRun } from "docx";
import { StyleMapping, mappingFactory } from "../mapping";

export const docxStyleMappingForDefaultSchema = mappingFactory(
  BlockNoteSchema.create()
).createStyleMapping<IRunPropertiesOptions>({
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
    return {
      strike: val,
    };
  },
  backgroundColor: (val) => {
    return {
      highlight: val,
    };
  },
  textColor: (val) => {
    return {
      color: val,
    };
  },
  code: (val) => {
    return {
      // TODO
      // font: "",
    };
  },
});

export function createDocxStyledTextTransformer<S extends StyleSchema>(
  mapping: StyleMapping<S, IRunPropertiesOptions>
) {
  return (styledText: StyledText<S>) => {
    const props = {
      text: styledText.text,
      ...Object.fromEntries(
        Object.entries(styledText.styles).map(([key, value]) => {
          return [key, mapping[key as keyof S](value)];
        })
      ),
    };

    return new TextRun(props);
  };
}
