import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useUIElementPositioning, useUIPluginState } from "@blocknote/react";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "@blocknote/react";

import { AIInlineToolbarProsemirrorPlugin } from "../../../core";
import { AIInlineToolbar } from "./AIInlineToolbar";
import { AIInlineToolbarProps } from "./AIInlineToolbarProps";

export const AIInlineToolbarController = (props: {
  aiToolbar?: FC<AIInlineToolbarProps>;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useUIPluginState(
    (
      editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
    ).onUpdate.bind(
      editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin // TODO
    )
  );

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    3000,
    {
      placement: "top-start",
      middleware: [offset(10), flip()],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { prompt, operation } = state;

  const Component = props.aiToolbar || AIInlineToolbar;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component prompt={prompt} operation={operation} />
    </div>
  );
};
