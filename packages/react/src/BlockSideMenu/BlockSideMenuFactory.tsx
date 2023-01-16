import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactSideBlockMenu } from "./components/BlockSideMenu";
import { createRoot, Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import Tippy from "@tippyjs/react";

export const ReactBlockSideMenuFactory: BlockSideMenuFactory = (
  staticParams: BlockSideMenuStaticParams
): BlockSideMenu => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent(dynamicParams: BlockSideMenuDynamicParams) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<ReactSideBlockMenu {...staticParams} {...dynamicParams} />}
          duration={0}
          getReferenceClientRect={() => dynamicParams.blockBoundingBox}
          hideOnClick={false}
          interactive={true}
          offset={[0, 0]}
          placement={"left"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  return {
    element: menuRootElement,
    show: (dynamicParams: BlockSideMenuDynamicParams) => {
      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent(dynamicParams));
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (dynamicParams: BlockSideMenuDynamicParams) => {
      menuRoot!.render(getMenuComponent(dynamicParams));
    },
  };
};
