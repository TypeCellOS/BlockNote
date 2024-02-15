import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useUiElement } from "../../hooks/useUiElement";
import { useUiElementPosition } from "../../hooks/useUiElementPosition";
import {
  DefaultHyperlinkToolbar,
  HyperlinkToolbarProps,
} from "./DefaultHyperlinkToolbar";

export const DefaultPositionedHyperlinkToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  hyperlinkToolbar?: FC<HyperlinkToolbarProps>;
}) => {
  const callbacks = {
    deleteHyperlink: props.editor.hyperlinkToolbar.deleteHyperlink,
    editHyperlink: props.editor.hyperlinkToolbar.editHyperlink,
    startHideTimer: props.editor.hyperlinkToolbar.startHideTimer,
    stopHideTimer: props.editor.hyperlinkToolbar.stopHideTimer,
  };

  const state = useUiElement(
    props.editor.hyperlinkToolbar.onUpdate.bind(props.editor.hyperlinkToolbar)
  );
  const { isMounted, ref, style } = useUiElementPosition(
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
