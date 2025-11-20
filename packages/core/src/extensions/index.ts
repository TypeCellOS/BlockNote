import { BlockChange } from "./BlockChange/BlockChange.js";
import { ForkYDoc } from "./Collaboration/ForkYDoc.js";
import { SchemaMigration } from "./Collaboration/schemaMigration/SchemaMigration.js";
import { YCursor } from "./Collaboration/YCursorPlugin.js";
import { YSync } from "./Collaboration/YSync.js";
import { YUndo } from "./Collaboration/YUndo.js";
import { Comments } from "./Comments/Comments.js";
import { DropCursor } from "./DropCursor/DropCursor.js";
import { FilePanel } from "./FilePanel/FilePanel.js";
import { FormattingToolbar } from "./FormattingToolbar/FormattingToolbar.js";
import { History } from "./History/History.js";
import { LinkToolbar } from "./LinkToolbar/LinkToolbar.js";
import { NodeSelectionKeyboard } from "./NodeSelectionKeyboard/NodeSelectionKeyboard.js";
import { Placeholder } from "./Placeholder/Placeholder.js";
import { PreviousBlockType } from "./PreviousBlockType/PreviousBlockType.js";
import { ShowSelection } from "./ShowSelection/ShowSelection.js";
import { SideMenu } from "./SideMenu/SideMenu.js";
import { SuggestionMenu } from "./SuggestionMenu/SuggestionMenu.js";
import { TableHandles } from "./TableHandles/TableHandles.js";
import { TrailingNode } from "./TrailingNode/TrailingNode.js";

export * from "./BlockChange/BlockChange.js";
export * from "./Collaboration/ForkYDoc.js";
export * from "./Collaboration/schemaMigration/SchemaMigration.js";
export * from "./Collaboration/YCursorPlugin.js";
export * from "./Collaboration/YSync.js";
export * from "./Collaboration/YUndo.js";
export * from "./Comments/Comments.js";
export * from "./DropCursor/DropCursor.js";
export * from "./FilePanel/FilePanel.js";
export * from "./FormattingToolbar/FormattingToolbar.js";
export * from "./History/History.js";
export * from "./LinkToolbar/LinkToolbar.js";
export * from "./LinkToolbar/protocols.js";
export * from "./NodeSelectionKeyboard/NodeSelectionKeyboard.js";
export * from "./Placeholder/Placeholder.js";
export * from "./PreviousBlockType/PreviousBlockType.js";
export * from "./ShowSelection/ShowSelection.js";
export * from "./SideMenu/SideMenu.js";
export * from "./SuggestionMenu/SuggestionMenu.js";
export * from "./SuggestionMenu/getDefaultSlashMenuItems.js";
export * from "./SuggestionMenu/getDefaultEmojiPickerItems.js";
export * from "./SuggestionMenu/DefaultSuggestionItem.js";
export * from "./SuggestionMenu/DefaultGridSuggestionItem.js";
export * from "./TableHandles/TableHandles.js";
export * from "./TrailingNode/TrailingNode.js";

export const DEFAULT_EXTENSIONS = [
  BlockChange,
  Comments,
  YCursor,
  DropCursor,
  FilePanel,
  ForkYDoc,
  FormattingToolbar,
  History,
  LinkToolbar,
  NodeSelectionKeyboard,
  Placeholder,
  PreviousBlockType,
  SchemaMigration,
  ShowSelection,
  SideMenu,
  SuggestionMenu,
  YSync,
  TableHandles,
  TrailingNode,
  YUndo,
] as const;
