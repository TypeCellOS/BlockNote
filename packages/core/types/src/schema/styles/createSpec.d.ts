import { ParseRule } from "@tiptap/pm/model";
import { StyleConfig, StyleSpec } from "./types.js";
export type CustomStyleImplementation<T extends StyleConfig> = {
    render: T["propSchema"] extends "boolean" ? () => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    } : (value: string) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
    };
};
export declare function getStyleParseRules(config: StyleConfig): ParseRule[];
export declare function createStyleSpec<T extends StyleConfig>(styleConfig: T, styleImplementation: CustomStyleImplementation<T>): StyleSpec<T>;
