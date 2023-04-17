import {
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ReactSlashMenuItem } from "./ReactSlashMenuItem";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const createReactSlashMenuFactory =
  (useDarkTheme?: boolean): SuggestionsMenuFactory<ReactSlashMenuItem> =>
  (staticParams): SuggestionsMenu<ReactSlashMenuItem> =>
    ReactElementFactory<
      SuggestionsMenuStaticParams<ReactSlashMenuItem>,
      SuggestionsMenuDynamicParams<ReactSlashMenuItem>
    >(staticParams, SlashMenu, useDarkTheme, {
      animation: "fade",
      placement: "bottom-start",
    });
