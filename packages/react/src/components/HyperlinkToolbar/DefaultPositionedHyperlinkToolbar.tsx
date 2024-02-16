import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import {
  DefaultHyperlinkToolbar,
  HyperlinkToolbarProps,
} from "./DefaultHyperlinkToolbar";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";

export const DefaultPositionedHyperlinkToolbar = (props: {
  hyperlinkToolbar?: FC<HyperlinkToolbarProps>;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

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

  const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar;

  return (
    <div ref={ref} style={style}>
      <HyperlinkToolbar {...data} {...callbacks} />
    </div>
  );
};
