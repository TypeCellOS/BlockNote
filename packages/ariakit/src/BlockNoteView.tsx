import {
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteViewProps,
  BlockNoteViewRaw,
  ComponentsContext,
} from "@blocknote/react";
import { components } from "./components.js";

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: BlockNoteViewProps<BSchema, ISchema, SSchema>
) => {
  const { className, ...rest } = props;

  return (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw
        className={mergeCSSClasses("bn-ariakit", className || "")}
        {...rest}
      />
    </ComponentsContext.Provider>
  );
};
