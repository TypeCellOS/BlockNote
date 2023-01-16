import { createRoot, Root } from "react-dom/client";
import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { SlashMenu } from "./components/SlashMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSlashMenuFactory: SuggestionsMenuFactory<SlashMenuItem> = (
  staticParams: SuggestionsMenuStaticParams<SlashMenuItem>
): SuggestionsMenu<SlashMenuItem> => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent(
    dynamicParams: SuggestionsMenuDynamicParams<SlashMenuItem>
  ) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<SlashMenu {...staticParams} {...dynamicParams} />}
          duration={0}
          getReferenceClientRect={() => dynamicParams.queryStartBoundingBox}
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
    show: (dynamicParams: SuggestionsMenuDynamicParams<SlashMenuItem>) => {
      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent(dynamicParams));
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (dynamicParams: SuggestionsMenuDynamicParams<SlashMenuItem>) => {
      menuRoot!.render(getMenuComponent(dynamicParams));
    },
  };
};
