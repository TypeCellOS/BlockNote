import { Node } from "@tiptap/core";
import { PropSchema, Props } from "../propTypes.js";
import { StyleSchema, Styles } from "../styles/types.js";
export type CustomInlineContentConfig = {
    type: string;
    content: "styled" | "none";
    readonly propSchema: PropSchema;
};
export type InlineContentConfig = CustomInlineContentConfig | "text" | "link";
export type InlineContentImplementation<T extends InlineContentConfig> = T extends "link" | "text" ? undefined : {
    node: Node;
};
export type InlineContentSpec<T extends InlineContentConfig> = {
    config: T;
    implementation: InlineContentImplementation<T>;
};
export type InlineContentSchema = Record<string, InlineContentConfig>;
export type InlineContentSpecs = {
    text: {
        config: "text";
        implementation: undefined;
    };
    link: {
        config: "link";
        implementation: undefined;
    };
} & Record<string, InlineContentSpec<InlineContentConfig>>;
export type InlineContentSchemaFromSpecs<T extends InlineContentSpecs> = {
    [K in keyof T]: T[K]["config"];
};
export type CustomInlineContentFromConfig<I extends CustomInlineContentConfig, S extends StyleSchema> = {
    type: I["type"];
    props: Props<I["propSchema"]>;
    content: I["content"] extends "styled" ? StyledText<S>[] : I["content"] extends "plain" ? string : I["content"] extends "none" ? undefined : never;
};
export type InlineContentFromConfig<I extends InlineContentConfig, S extends StyleSchema> = I extends "text" ? StyledText<S> : I extends "link" ? Link<S> : I extends CustomInlineContentConfig ? CustomInlineContentFromConfig<I, S> : never;
export type PartialCustomInlineContentFromConfig<I extends CustomInlineContentConfig, S extends StyleSchema> = {
    type: I["type"];
    props?: Props<I["propSchema"]>;
    content?: I["content"] extends "styled" ? StyledText<S>[] | string : I["content"] extends "plain" ? string : I["content"] extends "none" ? undefined : never;
};
export type PartialInlineContentFromConfig<I extends InlineContentConfig, S extends StyleSchema> = I extends "text" ? string | StyledText<S> : I extends "link" ? PartialLink<S> : I extends CustomInlineContentConfig ? PartialCustomInlineContentFromConfig<I, S> : never;
export type StyledText<T extends StyleSchema> = {
    type: "text";
    text: string;
    styles: Styles<T>;
};
export type Link<T extends StyleSchema> = {
    type: "link";
    href: string;
    content: StyledText<T>[];
};
export type PartialLink<T extends StyleSchema> = Omit<Link<T>, "content"> & {
    content: string | Link<T>["content"];
};
export type InlineContent<I extends InlineContentSchema, T extends StyleSchema> = InlineContentFromConfig<I[keyof I], T>;
type PartialInlineContentElement<I extends InlineContentSchema, T extends StyleSchema> = PartialInlineContentFromConfig<I[keyof I], T>;
export type PartialInlineContent<I extends InlineContentSchema, T extends StyleSchema> = PartialInlineContentElement<I, T>[] | string;
export declare function isLinkInlineContent<T extends StyleSchema>(content: InlineContent<any, T>): content is Link<T>;
export declare function isPartialLinkInlineContent<T extends StyleSchema>(content: PartialInlineContentElement<any, T>): content is PartialLink<T>;
export declare function isStyledTextInlineContent<T extends StyleSchema>(content: PartialInlineContentElement<any, T>): content is StyledText<T>;
export {};
