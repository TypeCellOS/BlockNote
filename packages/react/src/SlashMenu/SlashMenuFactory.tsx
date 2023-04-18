import {
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
  (theme: MantineThemeOverride): SuggestionsMenuFactory<ReactSlashMenuItem> =>
  (staticParams): SuggestionsMenu<ReactSlashMenuItem> =>
    ReactElementFactory<
      SuggestionsMenuStaticParams<ReactSlashMenuItem>,
      SuggestionsMenuDynamicParams<ReactSlashMenuItem>
    >(staticParams, SlashMenu, theme, {
      animation: "fade",
      placement: "bottom-start",
    });
