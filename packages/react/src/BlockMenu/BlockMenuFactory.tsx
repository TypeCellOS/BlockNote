import { BlockMenu, BlockMenuFactory, BlockMenuParams } from "@blocknote/core";
import {
  BlockMenu as ReactBlockMenu,
  BlockMenuProps,
} from "../BlockMenu/components/BlockMenu";
import { createRoot, Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import Tippy from "@tippyjs/react";

export const ReactBlockMenuFactory: BlockMenuFactory = (
  params: BlockMenuParams
): BlockMenu => {
  const blockMenuProps: BlockMenuProps = { ...params };

  function updateBlockMenuProps(params: BlockMenuParams) {
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
          content={<ReactBlockMenu {...blockMenuProps} />}
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
    show: (params: BlockMenuParams) => {
      updateBlockMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: BlockMenuParams) => {
      updateBlockMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
