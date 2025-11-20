import { BlockChange } from "./BlockChange/BlockChange.js";
import { Comments } from "./Comments/Comments.js";
import { YCursor } from "./Collaboration/YCursorPlugin.js";
import { DropCursor } from "./DropCursor/DropCursor.js";
import { FilePanel } from "./FilePanel/FilePanel.js";
import { ForkYDoc } from "./Collaboration/ForkYDoc.js";
import { FormattingToolbar } from "./FormattingToolbar/FormattingToolbar.js";
import { History } from "./History/HistoryExtension.js";
import { LinkToolbar } from "./LinkToolbar/LinkToolbar.js";
import { NodeSelectionKeyboard } from "./NodeSelectionKeyboard/NodeSelectionKeyboard.js";
import { Placeholder } from "./Placeholder/Placeholder.js";
import { PreviousBlockType } from "./PreviousBlockType/PreviousBlockType.js";
import { SchemaMigration } from "./Collaboration/schemaMigration/SchemaMigration.js";
import { ShowSelection } from "./ShowSelection/ShowSelection.js";
import { SideMenu } from "./SideMenu/SideMenu.js";
import { SuggestionMenu } from "./SuggestionMenu/SuggestionMenu.js";
import { YSync } from "./Collaboration/YSync.js";
import { TableHandles } from "./TableHandles/TableHandles.js";
import { TrailingNode } from "./TrailingNode/TrailingNode.js";
import { YUndo } from "./Collaboration/YUndo.js";

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
