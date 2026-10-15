import { KeyboardShortcutCommand, Node } from "@tiptap/core";

import {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { propsToDataAttributes, setDataAttributes } from "../dataAttributes.js";
import { PropSchema, Props } from "../propTypes.js";
import {
  CustomInlineContentConfig,
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
  PSchema extends PropSchema,
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  },
  inlineContentType: IType,
  inlineContentProps: Props<PSchema>,
  propSchema: PSchema,
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
} {
  // Sets content type attribute
  element.dom.setAttribute("data-inline-content-type", inlineContentType);
  // Adds the props as `data-*` attributes, leaving out those at their default.
  // Set only: the element is the author's, and their own attributes stay.
  setDataAttributes(
    element.dom,
    propsToDataAttributes(inlineContentProps, propSchema),
  );

  if (element.contentDOM) {
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
export function createInternalInlineContentSpec<
  const T extends CustomInlineContentConfig,
>(
  config: T,
  implementation: InlineContentImplementation<NoInfer<T>>,
  extensions?: (Extension | ExtensionFactoryInstance)[],
): InlineContentSpec<T> {
  return {
    config,
    implementation,
    extensions,
  } as const;
}

export function createInlineContentSpecFromTipTapNode<
  T extends Node,
  P extends PropSchema,
>(
  node: T,
  propSchema: P,
  implementation: Omit<
    InlineContentImplementation<CustomInlineContentConfig>,
    "node"
  >,
) {
  return createInternalInlineContentSpec(
    {
      type: node.name as T["name"],
      propSchema,
      content:
        node.config.content === "inline*"
          ? "styled"
          : node.config.content === "text*"
            ? "plain"
            : "none",
    },
    // Cast needed because `implementation` is typed against the generic
    // `CustomInlineContentConfig`, while `createInternalInlineContentSpec`
    // expects the implementation for the specific (still-generic) config
    // inferred from `node`/`propSchema` above.
    {
      ...implementation,
      node,
    } as unknown as InlineContentImplementation<{
      type: T["name"];
      propSchema: P;
      content: "styled" | "none" | "plain";
    }>,
  );
}

export function getInlineContentSchemaFromSpecs<T extends InlineContentSpecs>(
  specs: T,
) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config]),
  ) as InlineContentSchemaFromSpecs<T>;
}
