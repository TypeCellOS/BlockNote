import { createRoot, Root } from "react-dom/client";
import {
  SuggestionItem,
  SuggestionsMenu,
  SuggestionsMenuFactory,
  SuggestionsMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import {
  SuggestionList,
  SuggestionListProps,
} from "./components/SuggestionList";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSuggestionsMenuFactory: SuggestionsMenuFactory<
  SuggestionItem
> = (
  params: SuggestionsMenuParams<SuggestionItem>
): SuggestionsMenu<SuggestionItem> => {
  const suggestionsMenuProps: SuggestionListProps<SuggestionItem> = {
    ...params,
  };

  function updateSuggestionsMenuProps(
    params: SuggestionsMenuParams<SuggestionItem>
  ) {
    suggestionsMenuProps.items = params.items;
    suggestionsMenuProps.selectedItemIndex = params.selectedItemIndex;
    suggestionsMenuProps.itemCallback = params.itemCallback;
  }

  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<SuggestionList {...suggestionsMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.queryStartBoundingBox}
          hideOnClick={false}
          interactive={true}
          placement={"bottom-start"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  return {
    element: menuRootElement as HTMLElement,
    show: (params: SuggestionsMenuParams<SuggestionItem>) => {
      updateSuggestionsMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: SuggestionsMenuParams<SuggestionItem>) => {
      updateSuggestionsMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
