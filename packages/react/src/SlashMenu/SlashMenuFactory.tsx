import { createRoot, Root } from "react-dom/client";
import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuFactory,
  SuggestionsMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { SlashMenu, SlashMenuProps } from "./components/SlashMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSlashMenuFactory: SuggestionsMenuFactory<SlashMenuItem> = (
  params: SuggestionsMenuParams<SlashMenuItem>
): SuggestionsMenu<SlashMenuItem> => {
  const suggestionsMenuProps: SlashMenuProps = {
    ...params,
  };

  function updateSuggestionsMenuProps(
    params: SuggestionsMenuParams<SlashMenuItem>
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
          content={<SlashMenu {...suggestionsMenuProps} />}
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
    show: (params: SuggestionsMenuParams<SlashMenuItem>) => {
      updateSuggestionsMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: SuggestionsMenuParams<SlashMenuItem>) => {
      updateSuggestionsMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
