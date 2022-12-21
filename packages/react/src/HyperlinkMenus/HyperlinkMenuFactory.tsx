import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuProps,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { BlockNoteTheme } from "../BlockNoteTheme";
import { HyperlinkMenu } from "./components/HyperlinkMenu";

export const ReactHyperlinkMenuFactory: HyperlinkHoverMenuFactory = (
  props: HyperlinkHoverMenuProps
): HyperlinkHoverMenu => {
  const element = document.createElement("div");
  const root = createRoot(element);

  const menu = tippy(props.view.editorElement, {
    appendTo: props.view.editorElement,
    duration: 0,
    getReferenceClientRect: () => props.view.hyperlinkBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: false,
  });

  menu.show();

  return {
    element: element,
    show: (props: HyperlinkHoverMenuProps) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu
            url={props.hyperlink.url}
            text={props.hyperlink.text}
            update={props.hyperlink.edit}
            remove={props.hyperlink.delete}
          />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => props.view.hyperlinkBoundingBox,
      });

      menu.show();
    },
    hide: () => {
      menu.hide();
    },
    update: (newProps: HyperlinkHoverMenuProps) => {
      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu
            url={newProps.hyperlink.url}
            text={newProps.hyperlink.text}
            update={newProps.hyperlink.edit}
            remove={newProps.hyperlink.delete}
          />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => newProps.view.hyperlinkBoundingBox,
      });
    },
  };
};
