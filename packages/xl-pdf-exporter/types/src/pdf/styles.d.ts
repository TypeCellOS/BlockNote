import { StyleSchema, StyledText } from "@blocknote/core";
import { TextProps } from "@react-pdf/renderer";
import { StyleMapping } from "../mapping";
export declare const docxStyleMappingForDefaultSchema: StyleMapping<import("@blocknote/core").StyleSchemaFromSpecs<{
    bold: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    italic: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    underline: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    strike: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    code: {
        config: {
            type: string;
            propSchema: "boolean";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    textColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
    backgroundColor: {
        config: {
            type: string;
            propSchema: "string";
        };
        implementation: import("@blocknote/core").StyleImplementation;
    };
}>, Style>;
export declare function createDocxStyledTextTransformer<S extends StyleSchema>(mapping: StyleMapping<S, TextProps>): (styledText: StyledText<S>) => import("react/jsx-runtime").JSX.Element;
