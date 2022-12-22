import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { HyperlinkMenu } from "./components/HyperlinkMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuParams,
} from "@blocknote/core";

export const ReactHyperlinkMenuFactory: HyperlinkHoverMenuFactory = (
  params: HyperlinkHoverMenuParams
): HyperlinkHoverMenu => {
  const hyperlinkMenuProps: HyperlinkMenuProps = {
    url: params.hyperlinkUrl,
    text: params.hyperlinkText,
    update: params.editHyperlink,
    remove: params.deleteHyperlink,
  };

  function updateHyperlinkMenuProps(params: HyperlinkHoverMenuParams) {
    hyperlinkMenuProps.url = params.hyperlinkUrl;
    hyperlinkMenuProps.text = params.hyperlinkText;
  }

  const element = document.createElement("div");

  const root = createRoot(element);

  const menu = tippy(params.editorElement, {
    duration: 0,
    getReferenceClientRect: () => params.hyperlinkBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: false,
  });

  return {
    element: element,
    show: (params: HyperlinkHoverMenuParams) => {
      updateHyperlinkMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu {...hyperlinkMenuProps} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => params.hyperlinkBoundingBox,
      });

      menu.show();
    },
    hide: menu.hide,
    update: (params: HyperlinkHoverMenuParams) => {
      updateHyperlinkMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <HyperlinkMenu {...hyperlinkMenuProps} />
        </MantineProvider>
      );

      menu.setProps({
        getReferenceClientRect: () => params.hyperlinkBoundingBox,
      });
    },
  };
};
