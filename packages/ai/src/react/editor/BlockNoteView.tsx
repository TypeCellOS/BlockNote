import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import {
  BlockNoteViewComponent,
  BlockNoteViewProps as BlockNoteViewCoreProps,
  BlockNoteViewRaw as BlockNoteViewCoreRaw,
} from "@blocknote/react";
import {
  BlockNoteDefaultUI,
  BlockNoteDefaultUIProps,
} from "./BlockNoteDefaultUI";
import React, { ComponentProps } from "react";

export type BlockNoteViewProps<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> = BlockNoteViewCoreProps<BSchema, ISchema, SSchema> & BlockNoteDefaultUIProps;

export const BlockNoteViewRaw = React.forwardRef((props, ref) => (
  <BlockNoteViewCoreRaw
    {...props}
    formattingToolbar={false}
    linkToolbar={false}
    slashMenu={false}
    sideMenu={false}
    filePanel={false}
    tableHandles={false}
    emojiPicker={false}
    ref={ref}>
    <BlockNoteDefaultUI {...props} />
  </BlockNoteViewCoreRaw>
)) as <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: ComponentProps<
    typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>
  > & {
    ref?: React.ForwardedRef<HTMLDivElement>;
  }
) => ReturnType<typeof BlockNoteViewComponent<BSchema, ISchema, SSchema>>;
