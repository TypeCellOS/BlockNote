import { createRoot } from "react-dom/client";
import { HyperlinkMenu, HyperlinkMenuProps } from "./components/HyperlinkMenu";
import tippy from "tippy.js";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuInitProps,
  HyperlinkHoverMenuUpdateProps,
} from "../../../core/src/menu-tools/HyperlinkHoverMenu/types";

export const ReactHyperlinkMenuFactory: HyperlinkHoverMenuFactory = (
  initProps: HyperlinkHoverMenuInitProps
): HyperlinkHoverMenu => {
  const hyperlinkMenuProps: HyperlinkMenuProps = {
    url: "",
    text: "",
    update: initProps.editHyperlink,
    remove: initProps.deleteHyperlink,
  };

  function updateHyperlinkMenuProps(
    updateProps: HyperlinkHoverMenuUpdateProps
  ) {
    hyperlinkMenuProps.url = updateProps.hyperlinkUrl;
    hyperlinkMenuProps.text = updateProps.hyperlinkText;
  }

  const element = document.createElement("div");
  const root = createRoot(element);

  const menu = tippy(initProps.editorElement, {
    appendTo: initProps.editorElement,
    duration: 0,
    getReferenceClientRect: () => new DOMRect(),
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: false,
  });

  menu.show();

  return {
    element: element,
    show: (updateProps: HyperlinkHoverMenuUpdateProps) => {
      updateHyperlinkMenuProps(updateProps);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu {...hyperlinkMenuProps} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => updateProps.hyperlinkBoundingBox,
      });

      menu.show();
    },
    hide: () => {
      menu.hide();
    },
    update: (updateProps: HyperlinkHoverMenuUpdateProps) => {
      updateHyperlinkMenuProps(updateProps);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu {...hyperlinkMenuProps} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => updateProps.hyperlinkBoundingBox,
      });
    },
  };
};
