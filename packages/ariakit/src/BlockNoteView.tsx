import {
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { BlockNoteViewRaw, ComponentsContext } from "@blocknote/react";
import { components } from "./components.js";

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  props: React.ComponentProps<
    typeof BlockNoteViewRaw<BSchema, ISchema, SSchema>
  >,
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
