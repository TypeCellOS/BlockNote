import { Mark } from "@tiptap/core";
export type StylePropSchema = "boolean" | "string";
export type StyleConfig = {
    type: string;
    readonly propSchema: StylePropSchema;
};
export type StyleImplementation = {
    mark: Mark;
};
export type StyleSpec<T extends StyleConfig> = {
    config: T;
    implementation: StyleImplementation;
};
export type StyleSchema = Record<string, StyleConfig>;
export type StyleSpecs = Record<string, StyleSpec<StyleConfig>>;
export type StyleSchemaFromSpecs<T extends StyleSpecs> = {
    [K in keyof T]: T[K]["config"];
};
export type Styles<T extends StyleSchema> = {
    [K in keyof T]?: T[K]["propSchema"] extends "boolean" ? boolean : T[K]["propSchema"] extends "string" ? string : never;
};
