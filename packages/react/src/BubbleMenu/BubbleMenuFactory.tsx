import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuProps,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { BlockNoteTheme } from "../BlockNoteTheme";
import { BubbleMenu as ReactBubbleMenu } from "./components/BubbleMenu";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactBubbleMenuFactory: BubbleMenuFactory = (
  props: BubbleMenuProps
): BubbleMenu => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  let menu = tippy(props.view.editorElement, {
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
    update: (newProps: BubbleMenuProps) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={newProps} />
        </MantineProvider>
      );

      // TODO: Waits 500ms for animations to complete, looks clunky. See TODO in getBubbleMenuProps for why this is
      //  necessary.
      setTimeout(() => menu.popperInstance?.forceUpdate(), 350);
    },
  };
};
