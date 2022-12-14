import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../../../core/src/BlockNoteTheme";
import { BubbleMenu } from "./components/BubbleMenu";
import tippy from "tippy.js";
import {
  BubbleMenuFactory,
  BubbleMenuFactoryFunctions,
} from "../../../core/src/menu-tools/BubbleMenu/types";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactBubbleMenuFactory: BubbleMenuFactory = (
  bubbleMenuFactoryFunctions: BubbleMenuFactoryFunctions
) => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);
  root.render(
    <MantineProvider theme={BlockNoteTheme}>
      <BubbleMenu bubbleMenuFunctions={bubbleMenuFactoryFunctions} />
    </MantineProvider>
  );

  let menu = tippy(bubbleMenuFactoryFunctions.view.getEditorElement(), {
    duration: 0,
    getReferenceClientRect:
      bubbleMenuFactoryFunctions.view.getSelectionBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: menu.show,
    hide: menu.hide,
    // BubbleMenu React component updates its UI elements automatically with useState hooks, so we only need to ensure
    // the tippy menu updates its position.
    update: () => {
      menu.popperInstance?.forceUpdate();
    },
  };
};
