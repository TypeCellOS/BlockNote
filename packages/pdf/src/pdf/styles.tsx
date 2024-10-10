import { BlockNoteSchema, StyleSchema, StyledText } from "@blocknote/core";
import { Style, Text, TextProps } from "@react-pdf/renderer";
import { StyleMapping, mappingFactory } from "../mapping";

export const docxStyleMappingForDefaultSchema = mappingFactory(
  BlockNoteSchema.create()
).createStyleMapping<Style>({
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
});

export function createDocxStyledTextTransformer<S extends StyleSchema>(
  mapping: StyleMapping<S, TextProps>
) {
  return (styledText: StyledText<S>) => {
    const stylesArray = Object.entries(styledText.styles).map(
      ([key, value]) => {
        const mappedStyle = mapping[key](value);
        return mappedStyle;
      }
    );
    const styles = Object.assign({}, ...stylesArray);
    return <Text style={styles}>{styledText.text}</Text>;
  };
}
