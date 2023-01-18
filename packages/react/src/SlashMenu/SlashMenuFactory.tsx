import { createRoot, Root } from "react-dom/client";
import {
  SlashMenuItem,
  SuggestionsMenu,
  SuggestionsMenuDynamicParams,
  SuggestionsMenuFactory,
  SuggestionsMenuStaticParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { SlashMenu } from "./components/SlashMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactSlashMenuFactory: SuggestionsMenuFactory<SlashMenuItem> = (
  staticParams: SuggestionsMenuStaticParams<SlashMenuItem>
): SuggestionsMenu<SlashMenuItem> => {
  // We don't use the document body as a root as it would cause multiple React roots to be created on a single element
  // if other menu factories do the same.
  const rootElement = document.createElement("div");
  // rootElement.className = rootStyles.bnRoot;
  let root: Root | undefined;

  function getComponent(
    dynamicParams: SuggestionsMenuDynamicParams<SlashMenuItem>
  ) {
    return (
      <MantineProvider theme={BlockNoteTheme}>
        <Tippy
          appendTo={rootElement}
          content={<SlashMenu {...staticParams} {...dynamicParams} />}
          duration={0}
          getReferenceClientRect={() => dynamicParams.queryStartBoundingBox}
          hideOnClick={false}
          interactive={true}
          placement={"bottom-start"}
          showOnCreate={true}
          trigger={"manual"}
        />
      </MantineProvider>
    );
  }

  return {
    element: rootElement as HTMLElement,
    render: (
      dynamicParams: SuggestionsMenuDynamicParams<SlashMenuItem>,
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
