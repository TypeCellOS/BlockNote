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
});

export function createDocxStyledTextTransformer<S extends StyleSchema>(
  mapping: StyleMapping<S, IRunPropertiesOptions>
) {
  return (styledText: StyledText<S>) => {
    const stylesArray = Object.entries(styledText.styles).map(
      ([key, value]) => {
        const mappedStyle = mapping[key](value);
        return mappedStyle;
      }
    );
    const styles = Object.assign({}, ...stylesArray);

    // console.log(props);

    return new TextRun({ ...styles, text: styledText.text });
  };
}
