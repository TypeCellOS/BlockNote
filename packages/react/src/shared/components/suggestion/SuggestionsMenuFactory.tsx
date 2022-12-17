import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../../../BlockNoteTheme";
import tippy from "tippy.js";
import {
  SuggestionsMenuFactory,
  SuggestionsMenuFactoryFunctions,
} from "../../../../../core/src/menu-tools/SuggestionsMenu/types";
import { SuggestionList } from "./SuggestionList";
import SuggestionItem from "@blocknote/core/types/src/shared/plugins/suggestion/SuggestionItem";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSuggestionsMenuFactory: SuggestionsMenuFactory<
  SuggestionItem
> = () => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  const menu = tippy(document.body, {
    duration: 0,
    getReferenceClientRect: () => new DOMRect(),
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "bottom-start",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: (props: SuggestionsMenuFactoryFunctions<SuggestionItem>) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...props} />
        </MantineProvider>
      );

      menu.props.getReferenceClientRect = () =>
        props.view.selectedBlockBoundingBox;

      menu.show();
    },
    update: (newProps: SuggestionsMenuFactoryFunctions<SuggestionItem>) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...newProps} />
        </MantineProvider>
      );

      menu.props.getReferenceClientRect = () =>
        newProps.view.selectedBlockBoundingBox;
    },
    hide: () => {
      menu.hide();
    },
  };
};
