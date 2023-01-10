import { createRoot, Root } from "react-dom/client";
import {
  HyperlinkMenu,
  HyperlinkMenuFactory,
  HyperlinkMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import {
  HyperlinkMenu as ReactHyperlinkMenu,
  HyperlinkMenuProps,
} from "./components/HyperlinkMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactHyperlinkMenuFactory: HyperlinkMenuFactory = (
  params: HyperlinkMenuParams
): HyperlinkMenu => {
  const hyperlinkMenuProps: HyperlinkMenuProps = { ...params };

  function updateHyperlinkMenuProps(params: HyperlinkMenuParams) {
    hyperlinkMenuProps.url = params.url;
    hyperlinkMenuProps.text = params.text;
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
          content={<ReactHyperlinkMenu {...hyperlinkMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.boundingBox}
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
    show: (params: HyperlinkMenuParams) => {
      updateHyperlinkMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: HyperlinkMenuParams) => {
      updateHyperlinkMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
