import {
  AddBlockButton,
  AddBlockButtonFactory,
  AddBlockButtonParams,
} from "@blocknote/core";
import { AddBlockButtonProps } from "./components/AddBlockButton";
import { AddBlockButton as ReactAddBlockButton } from "./components/AddBlockButton";
import { BlockNoteTheme } from "../BlockNoteTheme";
import { MantineProvider } from "@mantine/core";
import { createRoot, Root } from "react-dom/client";
import Tippy from "@tippyjs/react";

export const ReactAddBlockButtonFactory: AddBlockButtonFactory = (
  params: AddBlockButtonParams
): AddBlockButton => {
  const addBlockButtonProps: AddBlockButtonProps = {
    ...params,
  };

  function updateAddBlockButtonProps(params: AddBlockButtonParams) {
    addBlockButtonProps.addBlock = params.addBlock;
  }

  function getMenuComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<ReactAddBlockButton {...addBlockButtonProps} />}
          duration={0}
          getReferenceClientRect={() => params.blockBoundingBox}
          hideOnClick={false}
          interactive={true}
          offset={[0, 24]}
          placement={"left"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  return {
    element: menuRootElement,
    show: (params: AddBlockButtonParams) => {
      updateAddBlockButtonProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot?.unmount();

      menuRootElement.remove();
    },
    update: (_params: AddBlockButtonParams) => {
      updateAddBlockButtonProps(params);

      menuRoot?.render(getMenuComponent());
    },
  };
};
