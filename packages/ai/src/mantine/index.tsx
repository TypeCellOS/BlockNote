import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { ComponentProps } from "react";
import {
  BlockNoteView as BlockNoteViewMantine,
  Theme,
} from "@blocknote/mantine";

import { BlockNoteViewRaw } from "../react";

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: Omit<
    ComponentProps<typeof BlockNoteViewRaw<BSchema, ISchema, SSchema>>,
    "theme"
  > & {
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
  }
) => <BlockNoteViewMantine {...props} viewComponent={BlockNoteViewRaw} />;
