import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import tippy from "tippy.js";
import { BlockNoteTheme } from "../../../core/src/BlockNoteTheme";
import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuParams,
} from "../../../core/src/menu-tools/BubbleMenu/types";
import {
  BubbleMenu as ReactBubbleMenu,
  BubbleMenuProps,
} from "./components/BubbleMenu";
// import rootStyles from "../../../core/src/root.module.css";

// TODO: Rename init & update props to something like static & dynamic props?
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
    // Can't use a constant and not all update props are needed.
    // bubbleMenuProps = {...params}

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

  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;

  const root = createRoot(element);

  let menu = tippy(params.editorElement, {
    duration: 0,
    getReferenceClientRect: () => params.selectionBoundingBox,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  return {
    element: element as HTMLElement,
    show: (params: BubbleMenuParams) => {
      updateBubbleMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={bubbleMenuProps} />
        </MantineProvider>
      );

      // Ensures that the component finishes rendering so that Tippy can display it in the correct position.
      setTimeout(() => {
        menu.setProps({
          getReferenceClientRect: () => params.selectionBoundingBox,
        });
      });

      menu.show();
    },
    hide: menu.hide,
    update: (params: BubbleMenuParams) => {
      updateBubbleMenuProps(params);

      root.render(
        <MantineProvider theme={BlockNoteTheme}>
          <ReactBubbleMenu bubbleMenuProps={bubbleMenuProps} />
        </MantineProvider>
      );

      // Ensures that the component finishes rendering so that Tippy can display it in the correct position.
      setTimeout(() => {
        menu.setProps({
          getReferenceClientRect: () => params.selectionBoundingBox,
        });
      });
    },
  };
};
