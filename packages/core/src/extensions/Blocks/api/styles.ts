export type StyleConfig = {
  type: string;
  readonly propSchema: "boolean" | "string";
  // content: "inline" | "none" | "table";
};

// @ts-ignore
export type StyleImplementation<T extends StyleConfig> = any;

// Container for both the config and implementation of a block,
// and the type of BlockImplementation is based on that of the config
export type StyleSpec<T extends StyleConfig> = {
  config: T;
  implementation: StyleImplementation<T>;
};

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

//   bold?: true;
//   italic?: true;
//   underline?: true;
//   strike?: true;
//   code?: true;
//   textColor?: string;
//   backgroundColor?: string;

// export type ToggledStyle = {
//   [K in keyof Styles]-?: Required<Styles>[K] extends true ? K : never;
// }[keyof Styles];

// export type ColorStyle = {
//   [K in keyof Styles]-?: Required<Styles>[K] extends string ? K : never;
// }[keyof Styles];
