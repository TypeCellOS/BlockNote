import { Attributes, Mark } from "@tiptap/core";
import { StyleConfig, StyleImplementation, StylePropSchema, StyleSchemaFromSpecs, StyleSpecs } from "./types.js";
export declare function stylePropsToAttributes(propSchema: StylePropSchema): Attributes;
export declare function addStyleAttributes<SType extends string, PSchema extends StylePropSchema>(element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
}, styleType: SType, styleValue: PSchema extends "boolean" ? undefined : string, propSchema: PSchema): {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
};
export declare function createInternalStyleSpec<T extends StyleConfig>(config: T, implementation: StyleImplementation): {
    config: T;
    implementation: StyleImplementation;
};
export declare function createStyleSpecFromTipTapMark<T extends Mark, P extends StylePropSchema>(mark: T, propSchema: P): {
    config: {
        type: T["name"];
        propSchema: P;
    };
    implementation: StyleImplementation;
};
export declare function getStyleSchemaFromSpecs<T extends StyleSpecs>(specs: T): StyleSchemaFromSpecs<T>;
