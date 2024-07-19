import * as locales from "./i18n/locales";
export {
  type ExternalHTMLExporter,
  createExternalHTMLExporter,
} from "./api/exporters/html/externalHTMLExporter";
export {
  type InternalHTMLSerializer,
  createInternalHTMLSerializer,
} from "./api/exporters/html/internalHTMLSerializer";
export { EditorTestCases } from "./api/testUtil";
export {
  AudioBlock,
  audioBlockConfig,
  audioParse,
  audioPropSchema,
  audioRender,
  audioToExternalHTML,
} from "./blocks/AudioBlockContent/AudioBlockContent";
export {
  FileBlock,
  fileBlockConfig,
  fileParse,
  filePropSchema,
  fileRender,
  fileToExternalHTML,
} from "./blocks/FileBlockContent/FileBlockContent";
export {
  ImageBlock,
  imageBlockConfig,
  imageParse,
  imagePropSchema,
  imageRender,
  imageToExternalHTML,
} from "./blocks/ImageBlockContent/ImageBlockContent";
export {
  VideoBlock,
  videoBlockConfig,
  videoParse,
  videoPropSchema,
  videoRender,
  videoToExternalHTML,
} from "./blocks/VideoBlockContent/VideoBlockContent";

export {
  createAddFileButton,
  createDefaultFilePreview,
  createFigureWithCaption,
  createFileAndCaptionWrapper,
  createLinkWithCaption,
  createResizeHandlesWrapper,
  parseEmbedElement,
  parseFigureElement,
} from "./blocks/FileBlockContent/fileBlockHelpers";
export { uploadToTmpFilesDotOrg_DEV_ONLY } from "./blocks/FileBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
export { parseImageElement } from "./blocks/ImageBlockContent/imageBlockHelpers";
export {
  checkBlockHasDefaultProp,
  checkBlockIsDefaultType,
  checkBlockIsFileBlock,
  checkBlockIsFileBlockWithPlaceholder,
  checkBlockIsFileBlockWithPreview,
  checkBlockTypeHasDefaultProp,
  checkDefaultBlockTypeInSchema,
  checkDefaultInlineContentTypeInSchema,
} from "./blocks/defaultBlockTypeGuards";
export {
  type Block,
  type DefaultBlockSchema,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type PartialBlock,
  type _DefaultBlockSchema,
  type _DefaultInlineContentSchema,
  type _DefaultStyleSchema,
  defaultBlockSchema,
  defaultBlockSpecs,
  defaultInlineContentSchema,
  defaultInlineContentSpecs,
  defaultStyleSchema,
  defaultStyleSpecs,
} from "./blocks/defaultBlocks";
export {
  type DefaultProps,
  defaultProps,
  inheritedProps,
} from "./blocks/defaultProps";
export {
  BlockNoteEditor,
  type BlockNoteEditorOptions,
} from "./editor/BlockNoteEditor";
export { getBlockNoteExtensions } from "./editor/BlockNoteExtensions";
export { BlockNoteSchema } from "./editor/BlockNoteSchema";
export { Selection } from "./editor/selectionTypes";
export { UiElementPosition } from "./extensions-shared/UiElementPosition";
export {
  FilePanelProsemirrorPlugin,
  type FilePanelState,
  FilePanelView,
} from "./extensions/FilePanel/FilePanelPlugin";
export {
  FormattingToolbarProsemirrorPlugin,
  type FormattingToolbarState,
  FormattingToolbarView,
  formattingToolbarPluginKey,
} from "./extensions/FormattingToolbar/FormattingToolbarPlugin";
export {
  LinkToolbarProsemirrorPlugin,
  type LinkToolbarState,
  linkToolbarPluginKey,
} from "./extensions/LinkToolbar/LinkToolbarPlugin";
export {
  SideMenuProsemirrorPlugin,
  type SideMenuState,
  SideMenuView,
  sideMenuPluginKey,
  getDraggableBlockFromElement,
} from "./extensions/SideMenu/SideMenuPlugin";
export { DefaultSuggestionItem } from "./extensions/SuggestionMenu/DefaultSuggestionItem";
export { DefaultGridSuggestionItem } from "./extensions/SuggestionMenu/DefaultGridSuggestionItem";
export {
  SuggestionMenuProseMirrorPlugin,
  type SuggestionMenuState,
  createSuggestionMenu,
} from "./extensions/SuggestionMenu/SuggestionPlugin";
export {
  filterSuggestionItems,
  getDefaultSlashMenuItems,
  insertOrUpdateBlock,
} from "./extensions/SuggestionMenu/getDefaultSlashMenuItems";
export { getDefaultEmojiPickerItems } from "./extensions/SuggestionMenu/getDefaultEmojiPickerItems";
export {
  TableHandlesProsemirrorPlugin,
  type TableHandlesState,
  TableHandlesView,
  tableHandlesPluginKey,
} from "./extensions/TableHandles/TableHandlesPlugin";
export { Dictionary } from "./i18n/dictionary";
export {
  type BlockConfig,
  type BlockFromConfig,
  type BlockFromConfigNoChildren,
  type BlockIdentifier,
  type BlockImplementations,
  type BlockNoDefaults,
  type BlockNoteDOMAttributes,
  type BlockNoteDOMElement,
  type BlockSchema,
  type BlockSchemaFromSpecs,
  type BlockSpecs,
  type BlockSchemaWithBlock,
  type BlockSpec,
  type CustomBlockConfig,
  type CustomBlockImplementation,
  type CustomInlineContentConfig,
  type CustomInlineContentFromConfig,
  type CustomInlineContentImplementation,
  type CustomStyleImplementation,
  type FileBlockConfig,
  type InlineContent,
  type InlineContentConfig,
  type InlineContentFromConfig,
  type InlineContentImplementation,
  type InlineContentSchema,
  type InlineContentSpecs,
  type InlineContentSchemaFromSpecs,
  type InlineContentSpec,
  type Link,
  type PartialBlockFromConfig,
  type PartialBlockNoDefaults,
  type PartialCustomInlineContentFromConfig,
  type PartialInlineContent,
  type PartialInlineContentFromConfig,
  type PartialLink,
  type PartialTableContent,
  type PropSchema,
  type PropSpec,
  type Props,
  type SpecificBlock,
  type SpecificPartialBlock,
  type StyleConfig,
  type StyleImplementation,
  type StylePropSchema,
  type StyleSchema,
  type StyleSpec,
  type StyleSpecs,
  type StyleSchemaFromSpecs,
  type StyledText,
  type Styles,
  type TableContent,
  type TiptapBlockImplementation,
  addInlineContentAttributes,
  addInlineContentKeyboardShortcuts,
  addStyleAttributes,
  createBlockSpec,
  createBlockSpecFromStronglyTypedTiptapNode,
  createInlineContentSpec,
  createInlineContentSpecFromTipTapNode,
  createInternalBlockSpec,
  createInternalInlineContentSpec,
  createInternalStyleSpec,
  createStronglyTypedTiptapNode,
  createStyleSpec,
  createStyleSpecFromTipTapMark,
  getBlockFromPos,
  getBlockSchemaFromSpecs,
  getInlineContentParseRules,
  getInlineContentSchemaFromSpecs,
  getParseRules,
  getStyleParseRules,
  getStyleSchemaFromSpecs,
  isLinkInlineContent,
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
  propsToAttributes,
  stylePropsToAttributes,
  wrapInBlockStructure,
} from "./schema";
export {
  formatKeyboardShortcut,
  isAppleOS,
  isSafari,
  mergeCSSClasses,
} from "./util/browser";
export { camelToDataKebab, filenameFromURL } from "./util/string";
export {
  type NoInfer,
  UnreachableCaseError,
  assertEmpty,
} from "./util/typescript";
export { locales };

// for testing from react (TODO: move):
export {
  blockToNode,
  contentNodeToInlineContent,
  inlineContentToNodes,
  nodeToBlock,
  nodeToCustomInlineContent,
  tableContentToNodes,
} from "./api/nodeConversions/nodeConversions";
export {
  addIdsToBlock,
  addIdsToBlocks,
  partialBlockToBlockForTesting,
  partialBlocksToBlocksForTesting,
} from "./api/testUtil/partialBlockTestUtil";
export { UniqueID } from "./extensions/UniqueID/UniqueID";

// for server-util (TODO: maybe move):
export {
  blocksToMarkdown,
  cleanHTMLToMarkdown,
} from "./api/exporters/markdown/markdownExporter";
export { HTMLToBlocks } from "./api/parsers/html/parseHTML";
export { markdownToBlocks } from "./api/parsers/markdown/parseMarkdown";
