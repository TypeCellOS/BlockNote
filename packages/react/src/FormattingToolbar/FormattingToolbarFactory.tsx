import { createRoot, Root } from "react-dom/client";
import {
  FormattingToolbar,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { FormattingToolbar as ReactFormattingToolbar } from "./components/FormattingToolbar";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactFormattingToolbarFactory: FormattingToolbarFactory = (
  staticParams: FormattingToolbarStaticParams
): FormattingToolbar => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const rootElement = document.createElement("div");
  // rootElement.className = rootStyles.bnRoot;
  let root: Root | undefined;

  function getComponent(dynamicParams: FormattingToolbarDynamicParams) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={rootElement}
          content={
            <ReactFormattingToolbar {...staticParams} {...dynamicParams} />
          }
          duration={0}
          getReferenceClientRect={() => dynamicParams.selectionBoundingBox}
          hideOnClick={false}
          interactive={true}
          placement={"top-start"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  return {
    element: rootElement,
    render: (
      dynamicParams: FormattingToolbarDynamicParams,
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
