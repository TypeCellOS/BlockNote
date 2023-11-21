import { PropSchema, Props } from "../blocks/types";
import { StyleSchema, Styles } from "../styles/types";

export type InlineContentConfig = {
  type: string;
  content: "styled" | "raw" | "none";
  readonly propSchema: PropSchema;
  // content: "inline" | "none" | "table";
};

// @ts-ignore
export type InlineContentImplementation<T extends InlineContentConfig> = any;

// Container for both the config and implementation of a block,
// and the type of BlockImplementation is based on that of the config
export type InlineContentSpec<T extends InlineContentConfig> = {
  config: T;
  implementation: InlineContentImplementation<T>;
};

export type InlineContentSchema = Record<string, InlineContentConfig>;

export type InlineContentSpecs = Record<
  string,
  InlineContentSpec<InlineContentConfig>
>;

export type InlineContentSchemaFromSpecs<T extends InlineContentSpecs> = {
  [K in keyof T]: T[K]["config"];
};

type InlineContentFromConfig<
  I extends InlineContentConfig,
  S extends StyleSchema
> = {
  type: I["type"];
  props: Props<I["propSchema"]>;
  content: I["content"] extends "styled"
    ? StyledText<S>[]
    : I["content"] extends "raw"
    ? string
    : I["content"] extends "none"
    ? undefined
    : never;
};

type PartialInlineContentFromConfig<
  I extends InlineContentConfig,
  S extends StyleSchema
> = {
  type: I["type"];
  props: Props<I["propSchema"]>;
  content: I["content"] extends "styled"
    ? StyledText<S>[] | string
    : I["content"] extends "raw"
    ? string
    : I["content"] extends "none"
    ? undefined
    : never;
};

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

export type InlineContent<
  I extends InlineContentSchema,
  T extends StyleSchema
> = StyledText<T> | Link<T> | InlineContentFromConfig<I[keyof I], T>;

type PartialInlineContentElement<
  I extends InlineContentSchema,
  T extends StyleSchema
> =
  | string
  | StyledText<T>
  | PartialLink<T>
  | PartialInlineContentFromConfig<I[keyof I], T>;

export type PartialInlineContent<
  I extends InlineContentSchema,
  T extends StyleSchema
> = PartialInlineContentElement<I, T>[] | string;

export function isLinkInlineContent<T extends StyleSchema>(
  content: InlineContent<any, T>
): content is Link<T> {
  return content.type === "link";
}

export function isPartialLinkInlineContent<T extends StyleSchema>(
  content: PartialInlineContentElement<any, T>
): content is PartialLink<T> {
  return typeof content !== "string" && content.type === "link";
}

export function isStyledTextInlineContent<T extends StyleSchema>(
  content: InlineContent<any, T>
): content is StyledText<T> {
  return content.type === "text";
}
