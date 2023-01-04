import {
  SuggestionItem,
  SuggestionsMenu,
  SuggestionsMenuFactory,
  SuggestionsMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { BlockNoteTheme } from "../../../BlockNoteTheme";
import { SuggestionList, SuggestionListProps } from "./SuggestionList";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSuggestionsMenuFactory: SuggestionsMenuFactory<
  SuggestionItem
> = (
  params: SuggestionsMenuParams<SuggestionItem>
): SuggestionsMenu<SuggestionItem> => {
  const suggestionsMenuProps: SuggestionListProps<SuggestionItem> = {
    ...params,
  };

  function updateSuggestionsMenuProps(params: SuggestionsMenuParams) {
    suggestionsMenuProps.items = params.items;
    suggestionsMenuProps.selectedItemIndex = params.selectedItemIndex;
    suggestionsMenuProps.itemCallback = params.itemCallback;
  }

  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  const menu = tippy(params.editorElement, {
    duration: 0,
    getReferenceClientRect: () => params.queryStartBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "bottom-start",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: (params: SuggestionsMenuParams<SuggestionItem>) => {
      updateSuggestionsMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...suggestionsMenuProps} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => params.queryStartBoundingBox,
      });

      menu.show();
    },
    hide: menu.hide,
    update: (params: SuggestionsMenuParams<SuggestionItem>) => {
      updateSuggestionsMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <SuggestionList {...suggestionsMenuProps} />
        </MantineProvider>
      );

      // setProps is a tippy function,
      // update the position based on passed in props
      menu.setProps({
        getReferenceClientRect: () => params.queryStartBoundingBox,
      });
    },
  };
};
