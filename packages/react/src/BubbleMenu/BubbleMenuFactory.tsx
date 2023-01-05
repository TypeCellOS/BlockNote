import { createRoot, Root } from "react-dom/client";
import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuParams,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import {
  BubbleMenu as ReactBubbleMenu,
  BubbleMenuProps,
} from "./components/BubbleMenu";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactBubbleMenuFactory: BubbleMenuFactory = (
  params: BubbleMenuParams
): BubbleMenu => {
  // TODO: Maybe just use {...params}?
  const bubbleMenuProps: BubbleMenuProps = {
    boldIsActive: params.boldIsActive,
    toggleBold: params.toggleBold,
    italicIsActive: params.italicIsActive,
    toggleItalic: params.toggleItalic,
    underlineIsActive: params.underlineIsActive,
    toggleUnderline: params.toggleUnderline,
    strikeIsActive: params.strikeIsActive,
    toggleStrike: params.toggleStrike,
    hyperlinkIsActive: params.hyperlinkIsActive,
    activeHyperlinkUrl: params.activeHyperlinkUrl,
    activeHyperlinkText: params.activeHyperlinkText,
    setHyperlink: params.setHyperlink,

    paragraphIsActive: params.paragraphIsActive,
    setParagraph: params.setParagraph,
    headingIsActive: params.headingIsActive,
    activeHeadingLevel: params.activeHeadingLevel,
    setHeading: params.setHeading,
    listItemIsActive: params.listItemIsActive,
    activeListItemType: params.activeListItemType,
    setListItem: params.setListItem,
  };

  function updateBubbleMenuProps(params: BubbleMenuParams) {
    bubbleMenuProps.boldIsActive = params.boldIsActive;
    bubbleMenuProps.italicIsActive = params.italicIsActive;
    bubbleMenuProps.underlineIsActive = params.underlineIsActive;
    bubbleMenuProps.strikeIsActive = params.strikeIsActive;
    bubbleMenuProps.hyperlinkIsActive = params.hyperlinkIsActive;
    bubbleMenuProps.activeHyperlinkUrl = params.activeHyperlinkUrl;
    bubbleMenuProps.activeHyperlinkText = params.activeHyperlinkText;

    bubbleMenuProps.paragraphIsActive = params.paragraphIsActive;
    bubbleMenuProps.headingIsActive = params.headingIsActive;
    bubbleMenuProps.activeHeadingLevel = params.activeHeadingLevel;
    bubbleMenuProps.listItemIsActive = params.listItemIsActive;
    bubbleMenuProps.activeListItemType = params.activeListItemType;
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
          content={<ReactBubbleMenu bubbleMenuProps={bubbleMenuProps} />}
          duration={0}
          getReferenceClientRect={() => params.selectionBoundingBox}
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
    show: (params: BubbleMenuParams) => {
      updateBubbleMenuProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: BubbleMenuParams) => {
      updateBubbleMenuProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
