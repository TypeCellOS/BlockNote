import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const ReactSlashMenuFactory: SuggestionsMenuFactory<SlashMenuItem> = (
  staticParams
): SuggestionsMenu<SlashMenuItem> =>
  ReactElementFactory<
    SuggestionsMenuStaticParams<SlashMenuItem>,
    SuggestionsMenuDynamicParams<SlashMenuItem>
  >(staticParams, SlashMenu, {
    animation: "fade",
    placement: "bottom-start",
  });
