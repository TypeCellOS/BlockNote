import { KeyboardShortcutCommand, Node } from "@tiptap/core";

import { camelToDataKebab } from "../../util/string.js";

import * as z from "zod/v4/core";
import {
  CustomInlineContentConfig,
  InlineContentConfig,
  InlineContentImplementation,
  InlineContentSchemaFromSpecs,
  InlineContentSpec,
  InlineContentSpecs,
} from "./types.js";
// Function that adds necessary classes and attributes to the `dom` element
// returned from a custom inline content's 'render' function, to ensure no data
// is lost on internal copy & paste.
export function addInlineContentAttributes<
  IType extends string,
  PSchema extends z.$ZodObject,
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  },
  inlineContentType: IType,
  inlineContentProps: z.infer<PSchema>,
  propSchema: z.$ZodObject,
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
} {
  // Sets content type attribute
  element.dom.setAttribute("data-inline-content-type", inlineContentType);
  // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips props
  // set to their default values.
  Object.entries(inlineContentProps)
    .filter(([prop, value]) => {
      const spec = propSchema._zod.def.shape[prop];
      const defaultValue =
        spec instanceof z.$ZodDefault ? spec._zod.def.defaultValue : undefined;
      return value !== defaultValue;
    })
    .map(([prop, value]) => {
      return [camelToDataKebab(prop), value] satisfies [string, unknown];
    })
    .forEach(([prop, value]) =>
      element.dom.setAttribute(prop, JSON.stringify(value)),
    );

  if (element.contentDOM !== undefined) {
    element.contentDOM.setAttribute("data-editable", "");
  }

  return element;
}

// see https://github.com/TypeCellOS/BlockNote/pull/435
export function addInlineContentKeyboardShortcuts<
  T extends CustomInlineContentConfig,
>(
  config: T,
): {
  [p: string]: KeyboardShortcutCommand;
} {
  return {
    Backspace: ({ editor }) => {
      const resolvedPos = editor.state.selection.$from;

      return (
        editor.state.selection.empty &&
        resolvedPos.node().type.name === config.type &&
        resolvedPos.parentOffset === 0
      );
    },
  };
}

// This helper function helps to instantiate a InlineContentSpec with a
// config and implementation that conform to the type of Config
export function createInternalInlineContentSpec<T extends InlineContentConfig>(
  config: T,
  implementation: InlineContentImplementation<T>,
) {
  return {
    config,
    implementation,
  } satisfies InlineContentSpec<T>;
}

export function createInlineContentSpecFromTipTapNode<
  T extends Node,
  P extends z.$ZodObject,
>(node: T, propSchema: P) {
  return createInternalInlineContentSpec(
    {
      type: node.name as T["name"],
      propSchema,
      content: node.config.content === "inline*" ? "styled" : "none",
    },
    {
      node,
    },
  );
}

export function getInlineContentSchemaFromSpecs<T extends InlineContentSpecs>(
  specs: T,
) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config]),
  ) as InlineContentSchemaFromSpecs<T>;
}
