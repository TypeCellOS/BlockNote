import { createRoot } from "react-dom/client";
import { HyperlinkMenu } from "./components/HyperlinkMenu";
import tippy from "tippy.js";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";
import {
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuFactoryFunctions,
} from "../../../core/src/menu-tools/HyperlinkHoverMenu/types";

export const ReactHyperlinkMenuFactory: HyperlinkHoverMenuFactory = (
  hyperlinkHoverMenuFactoryFunctions: HyperlinkHoverMenuFactoryFunctions
) => {
  const element = document.createElement("div");
  const root = createRoot(element);

  root.render(
    <MantineProvider theme={BlockNoteTheme}>
      <HyperlinkMenu
        url={hyperlinkHoverMenuFactoryFunctions.hyperlink.getUrl()}
        text={hyperlinkHoverMenuFactoryFunctions.hyperlink.getText()}
        update={hyperlinkHoverMenuFactoryFunctions.hyperlink.edit}
        remove={hyperlinkHoverMenuFactoryFunctions.hyperlink.delete}
      />
    </MantineProvider>
  );

  const menu = tippy(document.body, {
    duration: 0,
    getReferenceClientRect:
      hyperlinkHoverMenuFactoryFunctions.view.getHyperlinkBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  menu.show();

  return {
    element: element,
    show: menu.show,
    hide: menu.hide,
    update: () => {
      menu.popperInstance?.forceUpdate();
    },
  };
};
