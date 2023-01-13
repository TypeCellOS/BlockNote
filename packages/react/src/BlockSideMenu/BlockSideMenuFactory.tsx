import {
  BlockSideMenu,
  BlockSideMenuFactory,
  BlockSideMenuParams,
} from "@blocknote/core";
import {
  BlockSideMenu as ReactSideBlockMenu,
  BlockSideMenuProps,
} from "./components/BlockSideMenu";
import { createRoot, Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import Tippy from "@tippyjs/react";

export const ReactBlockSideMenuFactory: BlockSideMenuFactory = (
  params: BlockSideMenuParams
): BlockSideMenu => {
  const blockMenuProps: BlockSideMenuProps = { ...params };

  function updateBlockMenuProps(params: BlockSideMenuParams) {
    blockMenuProps.addBlock = params.addBlock;
    blockMenuProps.deleteBlock = params.deleteBlock;
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
          content={<ReactSideBlockMenu {...blockMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.blockBoundingBox}
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
    show: (params: BlockSideMenuParams) => {
      updateBlockMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: BlockSideMenuParams) => {
      updateBlockMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
