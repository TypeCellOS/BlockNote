import {
  BlockSchema,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ReactSlashMenuItem } from "./ReactSlashMenuItem";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { MantineThemeOverride } from "@mantine/core";

export const createReactSlashMenuFactory =
  <BSchema extends BlockSchema>(theme: MantineThemeOverride): SuggestionsMenuFactory<ReactSlashMenuItem<BSchema>> =>
  (staticParams): SuggestionsMenu<ReactSlashMenuItem<BSchema>> =>
    ReactElementFactory<
      SuggestionsMenuStaticParams<ReactSlashMenuItem<BSchema>>,
      SuggestionsMenuDynamicParams<ReactSlashMenuItem<BSchema>>
    >(staticParams, SlashMenu, theme, {
      animation: "fade",
      placement: "bottom-start",
    });
