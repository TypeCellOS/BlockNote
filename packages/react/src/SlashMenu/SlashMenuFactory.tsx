import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ElementFactory as ReactElementFactory } from "../ElementFactory";

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
