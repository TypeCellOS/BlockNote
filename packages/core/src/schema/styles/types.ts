import { Mark } from "@tiptap/core";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export type StylePropSchema = "boolean" | "string"; // TODO: use PropSchema as name? Use objects as type similar to blocks?

// StyleConfig contains the "schema" info about a Style type
// i.e. what props it supports, what content it supports, etc.
export type StyleConfig = {
  type: string;
  readonly propSchema: StylePropSchema;
};

// StyleImplementation contains the "implementation" info about a Style element.
// Currently, the implementation is always a TipTap Mark
export type StyleImplementation<T extends StyleConfig> = {
  mark: Mark;
  render: (
    value: T["propSchema"] extends "boolean" ? undefined : string,
    editor: BlockNoteEditor<any, any, any>,
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  toExternalHTML?: (
    value: T["propSchema"] extends "boolean" ? undefined : string,
    editor: BlockNoteEditor<any, any, any>,
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  runsBefore?: string[];
};

// Container for both the config and implementation of a Style,
// and the type of `implementation` is based on that of the config
export type StyleSpec<T extends StyleConfig> = {
  config: T;
  implementation: StyleImplementation<T>;
};

// A Schema contains all the types (Configs) supported in an editor
// The keys are the "type" of Styles supported
export type StyleSchema = Record<string, StyleConfig>;

export type StyleSpecs = Record<string, StyleSpec<StyleConfig>>;

export type StyleSchemaFromSpecs<T extends StyleSpecs> = {
  [K in keyof T]: T[K]["config"];
};

export type Styles<T extends StyleSchema> = {
  [K in keyof T]?: T[K]["propSchema"] extends "boolean"
    ? boolean
    : T[K]["propSchema"] extends "string"
      ? string
      : never;
};
