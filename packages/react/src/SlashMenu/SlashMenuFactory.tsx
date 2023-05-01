import {
  BlockSchema,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { SlashMenu } from "./components/SlashMenu";
import { ReactSlashMenuItem } from "./ReactSlashMenuItem";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const ReactSlashMenuFactory = <BSchema extends BlockSchema>(
  staticParams: SuggestionsMenuStaticParams<ReactSlashMenuItem<BSchema>>
): SuggestionsMenu<ReactSlashMenuItem<BSchema>> =>
  ReactElementFactory<
    SuggestionsMenuStaticParams<ReactSlashMenuItem<BSchema>>,
    SuggestionsMenuDynamicParams<ReactSlashMenuItem<BSchema>>
  >(staticParams, SlashMenu, {
    animation: "fade",
    placement: "bottom-start",
  });
