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
import { useMemo } from "react";

import { components } from "./components.js";
import {
  ShadCNComponents,
  ShadCNComponentsContext,
  ShadCNDefaultComponents,
} from "./ShadCNComponentsContext.js";

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: BlockNoteViewProps<BSchema, ISchema, SSchema> & {
    /**
     * (optional)Provide your own shadcn component overrides
     */
    shadCNComponents?: Partial<ShadCNComponents>;
  }
) => {
  const { className, shadCNComponents, ...rest } = props;

  const componentsValue = useMemo(() => {
    return {
      ...ShadCNDefaultComponents,
      ...shadCNComponents,
    };
  }, [shadCNComponents]);

  return (
    <ShadCNComponentsContext.Provider value={componentsValue}>
      <ComponentsContext.Provider value={components}>
        <BlockNoteViewRaw
          className={mergeCSSClasses("bn-shadcn", className || "")}
          {...rest}
        />
      </ComponentsContext.Provider>
    </ShadCNComponentsContext.Provider>
  );
};
