import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import { createRoot, Root } from "react-dom/client";
import {
  DragHandleMenu as ReactDragHandleMenu,
  DragHandleMenuProps,
} from "./components/DragHandleMenu";
import {
  DragHandleMenuFactory,
  DragHandleMenuParams,
  DragHandleMenu,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";

export const ReactDragHandleMenuFactory: DragHandleMenuFactory = (
  params: DragHandleMenuParams
): DragHandleMenu => {
  const dragHandleMenuProps: DragHandleMenuProps = {
    ...params,
  };

  function updateDragHandleMenuProps(params: DragHandleMenuParams) {
    dragHandleMenuProps.deleteBlock = params.deleteBlock;
  }

  function getMenuComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<ReactDragHandleMenu {...dragHandleMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.dragHandleBoundingBox}
          hideOnClick={false}
          interactive={true}
          // offset={[24, 0]}
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
    show: (params: DragHandleMenuParams) => {
      updateDragHandleMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot?.unmount();

      menuRootElement.remove();
    },
    update: (_params: DragHandleMenuParams) => {
      updateDragHandleMenuProps(params);

      menuRoot?.render(getMenuComponent());
    },
  };
};
