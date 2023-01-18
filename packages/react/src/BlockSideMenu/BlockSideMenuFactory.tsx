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
  const rootElement = document.createElement("div");
  // rootElement.className = rootStyles.bnRoot;
  let root: Root | undefined;

  function getComponent(dynamicParams: BlockSideMenuDynamicParams) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={rootElement}
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
    element: rootElement,
    render: (dynamicParams: BlockSideMenuDynamicParams, isHidden: boolean) => {
      if (isHidden) {
        document.body.appendChild(rootElement);
        root = createRoot(rootElement);
      }

      root!.render(getComponent(dynamicParams));
    },
    hide: () => {
      root!.unmount();

      rootElement.remove();
    },
  };
};
