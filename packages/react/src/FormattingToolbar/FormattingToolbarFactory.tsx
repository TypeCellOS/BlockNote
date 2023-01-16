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
  const menuRootElement = document.createElement("div");
  // menuRootElement.className = rootStyles.bnRoot;
  let menuRoot: Root | undefined;

  function getMenuComponent(dynamicParams: FormattingToolbarDynamicParams) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={menuRootElement}
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
    element: menuRootElement,
    show: (dynamicParams: FormattingToolbarDynamicParams) => {
      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent(dynamicParams));
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (dynamicParams: FormattingToolbarDynamicParams) => {
      menuRoot!.render(getMenuComponent(dynamicParams));
    },
  };
};
