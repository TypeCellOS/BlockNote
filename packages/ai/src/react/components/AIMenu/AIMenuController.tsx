import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useUIElementPositioning, useUIPluginState } from "@blocknote/react";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "@blocknote/react";

import { AIMenuProsemirrorPlugin } from "../../../core/extensions/AIMenu/AIMenuPlugin";
import { AIMenu } from "./AIMenu";
import { AIMenuProps } from "./AIMenuProps";

export const AIMenuController = (props: { aiMenu?: FC<AIMenuProps> }) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useUIPluginState(
    (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).onUpdate.bind(
      editor.extensions.aiMenu as AIMenuProsemirrorPlugin // TODO
    )
  );

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    3000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
      onOpenChange: (open) => {
        if (!open) {
          editor.linkToolbar.closeMenu();
          editor.focus();
        }
      },
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const Component = props.aiMenu || AIMenu;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component />
    </div>
  );
};
