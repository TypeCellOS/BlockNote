import { Node } from "@tiptap/core";
import { BlockNoteDOMAttributes, Props, PropSchema } from "../blocks/types";
import {
  InlineContentConfig,
  InlineContentImplementation,
  InlineContentSchemaFromSpecs,
  InlineContentSpec,
  InlineContentSpecs,
} from "./types";
import { mergeCSSClasses } from "../../../../shared/utils";
import { camelToDataKebab } from "../blocks/internal";

// Function that wraps the `dom` element returned from 'blockConfig.render' in a
// `blockContent` div, which contains the block type and props as HTML
// attributes. If `blockConfig.render` also returns a `contentDOM`, it also adds
// an `inlineContent` class to it.
export function addInlineContentAttributes<
  BType extends string,
  PSchema extends PropSchema
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    // destroy?: () => void;
  },
  inlineContentType: BType,
  inlineContentProps: Props<PSchema>,
  propSchema: PSchema,
  domAttributes?: BlockNoteDOMAttributes
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  // destroy?: () => void;
} {
  // Sets inline content & custom classes
  element.dom.className = mergeCSSClasses(
    "bn-inline-content",
    element.dom.className,
    domAttributes?.inlineContent?.class || ""
  );
  // Sets content type attribute
  element.dom.setAttribute("data-inline-content-type", inlineContentType);
  // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
  // props set to their default values.
  Object.entries(inlineContentProps)
    .filter(([prop, value]) => value !== propSchema[prop].default)
    .map(([prop, value]) => {
      return [camelToDataKebab(prop), value];
    })
    .forEach(([prop, value]) => element.dom.setAttribute(prop, value));
  // Adds custom HTML attributes
  Object.entries(domAttributes?.inlineContent || {})
    .filter(([key]) => key !== "class")
    .forEach(([attr, value]) => element.dom.setAttribute(attr, value));

  // Checks if the inline content contains an editable field
  if (element.contentDOM !== undefined) {
    // Adds inline editable & custom classes
    element.contentDOM.className = mergeCSSClasses(
      "bn-inline-editable",
      element.contentDOM.className,
      domAttributes?.inlineEditable?.class || ""
    );

    // Adds custom HTML attributes
    Object.entries(domAttributes?.inlineEditable || {})
      .filter(([key]) => key !== "class")
      .forEach(([attr, value]) =>
        element.contentDOM!.setAttribute(attr, value)
      );
  }

  return element;
}

// This helper function helps to instantiate a InlineContentSpec with a
// config and implementation that conform to the type of Config
export function createInternalInlineContentSpec<T extends InlineContentConfig>(
  config: T,
  implementation: InlineContentImplementation<T>
) {
  return {
    config,
    implementation,
  } satisfies InlineContentSpec<T>;
}

export function createInlineContentSpecFromTipTapNode<
  T extends Node,
  P extends PropSchema
>(node: T, propSchema: P) {
  return createInternalInlineContentSpec(
    {
      type: node.name as T["name"],
      propSchema,
      content: node.config.content === "inline*" ? "styled" : "none",
    },
    {
      node,
    }
  );
}

export function getInlineContentSchemaFromSpecs<T extends InlineContentSpecs>(
  specs: T
) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as InlineContentSchemaFromSpecs<T>;
}
