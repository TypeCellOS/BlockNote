// TODO: review directories
export {
  BlockNoteContext,
  useBlockNoteContext,
} from "./editor/BlockNoteContext";
export {
  BlockNoteDefaultUI,
  type BlockNoteDefaultUIProps,
} from "./editor/BlockNoteDefaultUI";
export { BlockNoteViewProps, BlockNoteViewRaw } from "./editor/BlockNoteView";
export {
  type ComponentProps,
  type Components,
  ComponentsContext,
  useComponentsContext,
} from "./editor/ComponentsContext";
export { useDictionary } from "./i18n/dictionary";

export {
  AudioPreview,
  AudioToExternalHTML,
  ReactAudioBlock,
} from "./blocks/AudioBlockContent/AudioBlockContent";
export {
  FileToExternalHTML,
  ReactFileBlock,
} from "./blocks/FileBlockContent/FileBlockContent";
export {
  AddFileButton,
  DefaultFilePreview,
  FigureWithCaption,
  FileAndCaptionWrapper,
  LinkWithCaption,
  ResizeHandlesWrapper,
} from "./blocks/FileBlockContent/fileBlockHelpers";
export { useResolveUrl } from "./blocks/FileBlockContent/useResolveUrl";
export {
  ImagePreview,
  ImageToExternalHTML,
  ReactImageBlock,
} from "./blocks/ImageBlockContent/ImageBlockContent";
export {
  ReactVideoBlock,
  VideoPreview,
  VideoToExternalHTML,
} from "./blocks/VideoBlockContent/VideoBlockContent";

export { BasicTextStyleButton } from "./components/FormattingToolbar/DefaultButtons/BasicTextStyleButton";
export { ColorStyleButton } from "./components/FormattingToolbar/DefaultButtons/ColorStyleButton";
export { CreateLinkButton } from "./components/FormattingToolbar/DefaultButtons/CreateLinkButton";
export { FileCaptionButton } from "./components/FormattingToolbar/DefaultButtons/FileCaptionButton";
export {
  NestBlockButton,
  UnnestBlockButton,
} from "./components/FormattingToolbar/DefaultButtons/NestBlockButtons";
export { FileReplaceButton } from "./components/FormattingToolbar/DefaultButtons/FileReplaceButton";
export { TextAlignButton } from "./components/FormattingToolbar/DefaultButtons/TextAlignButton";
export {
  BlockTypeSelect,
  type BlockTypeSelectItem,
  blockTypeSelectItems,
} from "./components/FormattingToolbar/DefaultSelects/BlockTypeSelect";
export {
  FormattingToolbar,
  getFormattingToolbarItems,
} from "./components/FormattingToolbar/FormattingToolbar";
export { FormattingToolbarController } from "./components/FormattingToolbar/FormattingToolbarController";
export { type FormattingToolbarProps } from "./components/FormattingToolbar/FormattingToolbarProps";

export { DeleteLinkButton } from "./components/LinkToolbar/DefaultButtons/DeleteLinkButton";
export { EditLinkButton } from "./components/LinkToolbar/DefaultButtons/EditLinkButton";
export { OpenLinkButton } from "./components/LinkToolbar/DefaultButtons/OpenLinkButton";
export { EditLinkMenuItems } from "./components/LinkToolbar/EditLinkMenuItems";
export { LinkToolbar } from "./components/LinkToolbar/LinkToolbar";
export { LinkToolbarController } from "./components/LinkToolbar/LinkToolbarController";
export { type LinkToolbarProps } from "./components/LinkToolbar/LinkToolbarProps";

export { AddBlockButton } from "./components/SideMenu/DefaultButtons/AddBlockButton";
export { DragHandleButton } from "./components/SideMenu/DefaultButtons/DragHandleButton";
export { SideMenu } from "./components/SideMenu/SideMenu";
export { SideMenuController } from "./components/SideMenu/SideMenuController";
export { type SideMenuProps } from "./components/SideMenu/SideMenuProps";

export { BlockColorsItem } from "./components/SideMenu/DragHandleMenu/DefaultItems/BlockColorsItem";
export { RemoveBlockItem } from "./components/SideMenu/DragHandleMenu/DefaultItems/RemoveBlockItem";
export { DragHandleMenu } from "./components/SideMenu/DragHandleMenu/DragHandleMenu";
export { type DragHandleMenuProps } from "./components/SideMenu/DragHandleMenu/DragHandleMenuProps";

export { SuggestionMenuController } from "./components/SuggestionMenu/SuggestionMenuController";
export { SuggestionMenuWrapper } from "./components/SuggestionMenu/SuggestionMenuWrapper";
export { getDefaultReactSlashMenuItems } from "./components/SuggestionMenu/getDefaultReactSlashMenuItems";
export { useCloseSuggestionMenuNoItems } from "./components/SuggestionMenu/hooks/useCloseSuggestionMenuNoItems";
export { useLoadSuggestionMenuItems } from "./components/SuggestionMenu/hooks/useLoadSuggestionMenuItems";
export { useSuggestionMenuKeyboardNavigation } from "./components/SuggestionMenu/hooks/useSuggestionMenuKeyboardNavigation";
export {
  type DefaultReactSuggestionItem,
  type SuggestionMenuProps,
} from "./components/SuggestionMenu/types";

export { GridSuggestionMenuController } from "./components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController";
export { GridSuggestionMenuWrapper } from "./components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuWrapper";
export { getDefaultReactEmojiPickerItems } from "./components/SuggestionMenu/GridSuggestionMenu/getDefaultReactEmojiPickerItems";
export { useGridSuggestionMenuKeyboardNavigation } from "./components/SuggestionMenu/GridSuggestionMenu/hooks/useGridSuggestionMenuKeyboardNavigation";
export {
  type DefaultReactGridSuggestionItem,
  type GridSuggestionMenuProps,
} from "./components/SuggestionMenu/GridSuggestionMenu/types";

export { EmbedTab } from "./components/FilePanel/DefaultTabs/EmbedTab";
export { UploadTab } from "./components/FilePanel/DefaultTabs/UploadTab";
export { FilePanel } from "./components/FilePanel/FilePanel";
export { FilePanelController } from "./components/FilePanel/FilePanelController";
export { type FilePanelProps } from "./components/FilePanel/FilePanelProps";

export { TableHandle } from "./components/TableHandles/TableHandle";
export { type TableHandleProps } from "./components/TableHandles/TableHandleProps";
export { TableHandlesController } from "./components/TableHandles/TableHandlesController";
export { useTableHandlesPositioning } from "./components/TableHandles/hooks/useTableHandlesPositioning";

export {
  AddButton,
  AddColumnButton,
  AddRowButton,
} from "./components/TableHandles/TableHandleMenu/DefaultButtons/AddButton";
export {
  DeleteButton,
  DeleteColumnButton,
  DeleteRowButton,
} from "./components/TableHandles/TableHandleMenu/DefaultButtons/DeleteButton";
export { TableHandleMenu } from "./components/TableHandles/TableHandleMenu/TableHandleMenu";
export { type TableHandleMenuProps } from "./components/TableHandles/TableHandleMenu/TableHandleMenuProps";

export { useActiveStyles } from "./hooks/useActiveStyles";
export { useBlockNoteEditor } from "./hooks/useBlockNoteEditor";
export { useCreateBlockNote } from "./hooks/useCreateBlockNote";
export { useEditorChange } from "./hooks/useEditorChange";
export { useEditorContentOrSelectionChange } from "./hooks/useEditorContentOrSelectionChange";
export { useEditorForceUpdate } from "./hooks/useEditorForceUpdate";
export { useEditorSelectionChange } from "./hooks/useEditorSelectionChange";
export { usePrefersColorScheme } from "./hooks/usePrefersColorScheme";
export { useSelectedBlocks } from "./hooks/useSelectedBlocks";

export {
  BlockContentWrapper,
  type ReactCustomBlockImplementation,
  type ReactCustomBlockRenderProps,
  createReactBlockSpec,
} from "./schema/ReactBlockSpec";
export {
  InlineContentWrapper,
  type ReactInlineContentImplementation,
  createReactInlineContentSpec,
} from "./schema/ReactInlineContentSpec";
export {
  type ReactCustomStyleImplementation,
  createReactStyleSpec,
} from "./schema/ReactStyleSpec";

export { mergeRefs } from "./util/mergeRefs";
export { elementOverflow } from "./util/elementOverflow";
