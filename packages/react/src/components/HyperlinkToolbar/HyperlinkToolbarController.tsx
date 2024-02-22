import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { HyperlinkToolbarProps } from "./HyperlinkToolbarProps";
import { HyperlinkToolbar } from "./mantine/HyperlinkToolbar";

export const HyperlinkToolbarController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  hyperlinkToolbar?: FC<HyperlinkToolbarProps>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

  const callbacks = {
    deleteHyperlink: editor.hyperlinkToolbar.deleteHyperlink,
    editHyperlink: editor.hyperlinkToolbar.editHyperlink,
    startHideTimer: editor.hyperlinkToolbar.startHideTimer,
    stopHideTimer: editor.hyperlinkToolbar.stopHideTimer,
  };

  const state = useUIPluginState(
    editor.hyperlinkToolbar.onUpdate.bind(editor.hyperlinkToolbar)
  );
  const { isMounted, ref, style } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    4000,
    {
      placement: "top-start",
      middleware: [offset(10), flip()],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const Component = props.hyperlinkToolbar || HyperlinkToolbar;

  return (
    <div ref={ref} style={style}>
      <Component {...data} {...callbacks} />
    </div>
  );
};
