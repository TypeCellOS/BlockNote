import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../../../core/src/BlockNoteTheme";
import { BubbleMenu as ReactBubbleMenu } from "./components/BubbleMenu";
import tippy from "tippy.js";
import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuProps,
} from "../../../core/src/menu-tools/BubbleMenu/types";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactBubbleMenuFactory: BubbleMenuFactory = (
  props: BubbleMenuProps
): BubbleMenu => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  let menu = tippy(props.view.getEditorElement(), {
    duration: 0,
    getReferenceClientRect: props.view.getSelectionBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: (props: BubbleMenuProps) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={props} />
        </MantineProvider>
      );
      menu.show();
    },
    hide: menu.hide,
    // BubbleMenu React component updates its UI elements automatically with useState hooks, so we only need to ensure
    // the tippy menu updates its position.
    update: (newProps: BubbleMenuProps) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={newProps} />
        </MantineProvider>
      );
      // Waits one second for animation to complete. Can be a bit clunky.
      setTimeout(() => menu.popperInstance?.forceUpdate(), 1000);
    },
  };
};
