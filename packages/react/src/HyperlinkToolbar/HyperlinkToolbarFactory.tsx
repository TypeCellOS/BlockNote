import { createRoot, Root } from "react-dom/client";
import {
  HyperlinkToolbar,
  HyperlinkToolbarFactory,
  HyperlinkToolbarParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import {
  HyperlinkToolbar as ReactHyperlinkToolbar,
  HyperlinkToolbarProps,
} from "./components/HyperlinkToolbar";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactHyperlinkToolbarFactory: HyperlinkToolbarFactory = (
  params: HyperlinkToolbarParams
): HyperlinkToolbar => {
  const hyperlinkToolbarProps: HyperlinkToolbarProps = { ...params };

  function updateHyperlinkToolbarProps(params: HyperlinkToolbarParams) {
    hyperlinkToolbarProps.url = params.url;
    hyperlinkToolbarProps.text = params.text;
  }

  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other UI factories do the same.
  const rootElement = document.createElement("div");
  let root: Root | undefined;

  function getComponent() {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={rootElement}
          content={<ReactHyperlinkToolbar {...hyperlinkToolbarProps} />}
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
    element: rootElement,
    show: (params: HyperlinkToolbarParams) => {
      updateHyperlinkToolbarProps(params);

      document.body.appendChild(rootElement);
      root = createRoot(rootElement);

      root.render(getComponent());
    },
    hide: () => {
      root!.unmount();

      rootElement.remove();
    },
    update: (params: HyperlinkToolbarParams) => {
      updateHyperlinkToolbarProps(params);

      root!.render(getComponent());
    },
  };
};
