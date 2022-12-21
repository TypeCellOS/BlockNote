import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { BlockNoteTheme } from "../../../core/src/BlockNoteTheme";
import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuInitProps,
  BubbleMenuUpdateProps,
} from "../../../core/src/menu-tools/BubbleMenu/types";
import {
  BubbleMenu as ReactBubbleMenu,
  BubbleMenuProps,
} from "./components/BubbleMenu";
// import rootStyles from "../../../core/src/root.module.css";

// TODO: Rename init & update props to something like static & dynamic props?
export const ReactBubbleMenuFactory: BubbleMenuFactory = (
  initProps: BubbleMenuInitProps
): BubbleMenu => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);

  let menu = tippy(initProps.editorElement, {
    duration: 0,
    getReferenceClientRect: initProps.getSelectionBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  const bubbleMenuProps: BubbleMenuProps = {
    boldIsActive: false,
    toggleBold: initProps.toggleBold,
    italicIsActive: false,
    toggleItalic: initProps.toggleItalic,
    underlineIsActive: false,
    toggleUnderline: initProps.toggleUnderline,
    strikeIsActive: false,
    toggleStrike: initProps.toggleStrike,
    hyperlinkIsActive: false,
    activeHyperlinkUrl: "",
    activeHyperlinkText: "",
    setHyperlink: initProps.setHyperlink,

    paragraphIsActive: false,
    setParagraph: initProps.setParagraph,
    headingIsActive: false,
    activeHeadingLevel: "",
    setHeading: initProps.setHeading,
    listItemIsActive: false,
    activeListItemType: "",
    setListItem: initProps.setListItem,
  };

  function updateBubbleMenuProps(updateProps: BubbleMenuUpdateProps) {
    // Can't use a constant and not all update props might be needed, though they are in this case.
    // bubbleMenuProps = {...bubbleMenuProps, ...updateProps}

    bubbleMenuProps.boldIsActive = updateProps.boldIsActive;
    bubbleMenuProps.italicIsActive = updateProps.italicIsActive;
    bubbleMenuProps.underlineIsActive = updateProps.underlineIsActive;
    bubbleMenuProps.strikeIsActive = updateProps.strikeIsActive;
    bubbleMenuProps.hyperlinkIsActive = updateProps.hyperlinkIsActive;
    bubbleMenuProps.activeHyperlinkUrl = updateProps.activeHyperlinkUrl;
    bubbleMenuProps.activeHyperlinkText = updateProps.activeHyperlinkText;

    bubbleMenuProps.paragraphIsActive = updateProps.paragraphIsActive;
    bubbleMenuProps.headingIsActive = updateProps.headingIsActive;
    bubbleMenuProps.activeHeadingLevel = updateProps.activeHeadingLevel;
    bubbleMenuProps.listItemIsActive = updateProps.listItemIsActive;
    bubbleMenuProps.activeListItemType = updateProps.activeListItemType;
  }

  return {
    element: element as HTMLElement,
    show: (updateProps: BubbleMenuUpdateProps) => {
      updateBubbleMenuProps(updateProps);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={bubbleMenuProps} />
        </MantineProvider>
      );

      menu.show();
    },
    hide: menu.hide,
    update: (updateProps: BubbleMenuUpdateProps) => {
      updateBubbleMenuProps(updateProps);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={bubbleMenuProps} />
        </MantineProvider>
      );

      menu.popperInstance?.forceUpdate();
    },
  };
};
