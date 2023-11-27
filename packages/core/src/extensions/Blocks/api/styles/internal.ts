import { Mark } from "@tiptap/core";
import {
  StyleConfig,
  StyleImplementation,
  StylePropSchema,
  StyleSchemaFromSpecs,
  StyleSpec,
  StyleSpecs,
} from "./types";

// This helper function helps to instantiate a stylespec with a
// config and implementation that conform to the type of Config
export function createInternalStyleSpec<T extends StyleConfig>(
  config: T,
  implementation: StyleImplementation
) {
  return {
    config,
    implementation,
  } satisfies StyleSpec<T>;
}

export function createStyleSpecFromTipTapMark<
  T extends Mark,
  P extends StylePropSchema
>(mark: T, propSchema: P) {
  return createInternalStyleSpec(
    {
      type: mark.name as T["name"],
      propSchema,
    },
    {
      mark,
    }
  );
}

export function getStyleSchemaFromSpecs<T extends StyleSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as StyleSchemaFromSpecs<T>;
}
