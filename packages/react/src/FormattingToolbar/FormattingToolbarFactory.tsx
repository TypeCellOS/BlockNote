import { createRoot, Root } from "react-dom/client";
import {
  FormattingToolbar,
  FormattingToolbarParams,
  FormattingToolbarFactory,
} from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import Tippy from "@tippyjs/react";
import {
  FormattingToolbar as ReactFormattingToolbar,
  FormattingToolbarProps,
} from "./components/FormattingToolbar";
import { BlockNoteTheme } from "../BlockNoteTheme";
// import rootStyles from "../../../core/src/root.module.css";

export const ReactFormattingToolbarFactory: FormattingToolbarFactory = (
  params: FormattingToolbarParams
): FormattingToolbar => {
  // TODO: Maybe just use {...params}?
  const formattingToolbarProps: FormattingToolbarProps = {
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

  function updateFormattingToolbarProps(params: FormattingToolbarParams) {
    formattingToolbarProps.boldIsActive = params.boldIsActive;
    formattingToolbarProps.italicIsActive = params.italicIsActive;
    formattingToolbarProps.underlineIsActive = params.underlineIsActive;
    formattingToolbarProps.strikeIsActive = params.strikeIsActive;
    formattingToolbarProps.hyperlinkIsActive = params.hyperlinkIsActive;
    formattingToolbarProps.activeHyperlinkUrl = params.activeHyperlinkUrl;
    formattingToolbarProps.activeHyperlinkText = params.activeHyperlinkText;

    formattingToolbarProps.paragraphIsActive = params.paragraphIsActive;
    formattingToolbarProps.headingIsActive = params.headingIsActive;
    formattingToolbarProps.activeHeadingLevel = params.activeHeadingLevel;
    formattingToolbarProps.listItemIsActive = params.listItemIsActive;
    formattingToolbarProps.activeListItemType = params.activeListItemType;
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
          content={
            <ReactFormattingToolbar
              formattingToolbarProps={formattingToolbarProps}
            />
          }
          duration={0}
          getReferenceClientRect={() => params.selectionBoundingBox}
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
    show: (params: FormattingToolbarParams) => {
      updateFormattingToolbarProps(params);

      document.body.appendChild(menuRootElement);
      menuRoot = createRoot(menuRootElement);

      menuRoot.render(getMenuComponent());
    },
    hide: () => {
      menuRoot!.unmount();

      menuRootElement.remove();
    },
    update: (params: FormattingToolbarParams) => {
      updateFormattingToolbarProps(params);

      menuRoot!.render(getMenuComponent());
    },
  };
};
