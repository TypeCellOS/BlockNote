import {
  DragHandle,
  DragHandleFactory,
  DragHandleParams,
} from "@blocknote/core";
import { DragHandle as ReactDragHandle } from "./components/DragHandle";
import { BlockNoteTheme } from "../BlockNoteTheme";
import { MantineProvider } from "@mantine/core";
import { createRoot, Root } from "react-dom/client";
import Tippy from "@tippyjs/react";

export const ReactDragHandleFactory: DragHandleFactory = (
  params: DragHandleParams
): DragHandle => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  menuRootElement.style.position = "absolute";
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<ReactDragHandle />}
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
    show: (_params: DragHandleParams) => {
      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot?.unmount();

      menuRootElement.remove();
    },
    update: (_params: DragHandleParams) => {
      menuRoot?.render(getMenuComponent());
    },
  };
};
