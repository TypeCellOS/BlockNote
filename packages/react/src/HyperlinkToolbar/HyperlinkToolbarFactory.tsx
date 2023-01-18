import { createRoot, Root } from "react-dom/client";
import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarFactory,
  HyperlinkToolbarStaticParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { HyperlinkToolbar as ReactHyperlinkToolbar } from "./components/HyperlinkToolbar";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactHyperlinkToolbarFactory: HyperlinkToolbarFactory = (
  staticParams: HyperlinkToolbarStaticParams
): HyperlinkToolbar => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other UI factories do the same.
  const rootElement = document.createElement("div");
  let root: Root | undefined;

  function getComponent(dynamicParams: HyperlinkToolbarDynamicParams) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={rootElement}
          content={
            <ReactHyperlinkToolbar {...staticParams} {...dynamicParams} />
          }
          duration={0}
          getReferenceClientRect={() => dynamicParams.boundingBox}
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
    render: (
      dynamicParams: HyperlinkToolbarDynamicParams,
      isHidden: boolean
    ) => {
      if (isHidden) {
        document.body.appendChild(rootElement);
        root = createRoot(rootElement);
      }

      root!.render(getComponent(dynamicParams));
    },
    hide: () => {
      root!.unmount();

      rootElement.remove();
    },
  };
};
