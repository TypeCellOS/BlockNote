import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ReactEditorElementFactory } from "../EditorElementFactory";

export const ReactSlashMenuFactory: SuggestionsMenuFactory<SlashMenuItem> = (
  staticParams
): SuggestionsMenu<SlashMenuItem> =>
  ReactEditorElementFactory<
    SuggestionsMenuStaticParams<SlashMenuItem>,
    SuggestionsMenuDynamicParams<SlashMenuItem>
  >(staticParams, SlashMenu, {
    animation: "fade",
    placement: "bottom-start",
  });
