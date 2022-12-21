import SuggestionItem from "@blocknote/core/types/src/shared/plugins/suggestion/SuggestionItem";
import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import {
  SuggestionsMenu,
  SuggestionsMenuFactory,
  SuggestionsMenuProps,
} from "../../../../../core/src/menu-tools/SuggestionsMenu/types";
import { BlockNoteTheme } from "../../../BlockNoteTheme";
import { SuggestionList } from "./SuggestionList";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSuggestionsMenuFactory: SuggestionsMenuFactory<
  SuggestionItem
> = (
  props: SuggestionsMenuProps<SuggestionItem>
): SuggestionsMenu<SuggestionItem> => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  const menu = tippy(props.view.editorElement, {
    duration: 0,
    getReferenceClientRect: () => props.view.selectedBlockBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "bottom-start",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: (props: SuggestionsMenuProps<SuggestionItem>) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...props} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => props.view.selectedBlockBoundingBox,
      });

      menu.show();
    },
    update: (newProps: SuggestionsMenuProps<SuggestionItem>) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...newProps} />
        </MantineProvider>
      );

      // setProps is a tippy function,
      // update the position based on passed in props
      menu.setProps({
        getReferenceClientRect: () => newProps.view.selectedBlockBoundingBox,
      });
    },
    hide: () => {
      menu.hide();
    },
  };
};
