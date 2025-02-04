import { InlineContentSchema, StyleSchema } from "@blocknote/core";
import { ReactNode } from "react";
import { TableHandleMenuProps } from "./TableHandleMenuProps.js";
export declare const TableHandleMenu: <I extends InlineContentSchema = import("@blocknote/core").InlineContentSchemaFromSpecs<{
    text: {
        config: "text";
        implementation: any;
    };
    link: {
        config: "link";
        implementation: any;
    };
}>, S extends StyleSchema = import("@blocknote/core").StyleSchemaFromSpecs<{
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
}>>(props: TableHandleMenuProps<I, S> & {
    children?: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
