import { createRoot, Root } from "react-dom/client";
import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { HyperlinkMenu, HyperlinkMenuProps } from "./components/HyperlinkMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

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

  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
          content={<HyperlinkMenu {...hyperlinkMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.hyperlinkBoundingBox}
          hideOnClick={false}
          interactive={true}
          placement={"top"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  return {
    element: menuRootElement,
    show: (params: HyperlinkHoverMenuParams) => {
      updateHyperlinkMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: HyperlinkHoverMenuParams) => {
      updateHyperlinkMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
