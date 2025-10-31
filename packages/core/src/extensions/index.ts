import { BlockChangePlugin } from "./BlockChange/BlockChangePlugin.js";
import { CommentsPlugin } from "./Comments/CommentsPlugin.js";
import { CursorPlugin } from "./Collaboration/CursorPlugin.js";
import { DropCursor } from "./DropCursor/DropCursor.js";
import { FilePanelPlugin } from "./FilePanel/FilePanelPlugin.js";
import { ForkYDocPlugin } from "./Collaboration/ForkYDocPlugin.js";
import { FormattingToolbarExtension } from "./FormattingToolbar/FormattingToolbarPlugin.js";
import { HistoryExtension } from "./History/HistoryExtension.js";
import { LinkToolbarPlugin } from "./LinkToolbar/LinkToolbar.js";
import { NodeSelectionKeyboardPlugin } from "./NodeSelectionKeyboard/NodeSelectionKeyboardPlugin.js";
import { PlaceholderPlugin } from "./Placeholder/PlaceholderPlugin.js";
import { PreviousBlockTypePlugin } from "./PreviousBlockType/PreviousBlockTypePlugin.js";
import { SchemaMigrationPlugin } from "./Collaboration/schemaMigration/SchemaMigrationPlugin.js";
import { ShowSelectionPlugin } from "./ShowSelection/ShowSelectionPlugin.js";
import { SideMenuProsemirrorPlugin } from "./SideMenu/SideMenuPlugin.js";
import { SuggestionMenuPlugin } from "./SuggestionMenu/SuggestionPlugin.js";
import { SyncPlugin } from "./Collaboration/SyncPlugin.js";
import { TableHandlesPlugin } from "./TableHandles/TableHandlesPlugin.js";
import { TrailingNode } from "./TrailingNode/TrailingNodeExtension.js";
import { UndoPlugin } from "./Collaboration/UndoPlugin.js";

export const DEFAULT_EXTENSIONS = [
  BlockChangePlugin,
  CommentsPlugin,
  CursorPlugin,
  DropCursor,
  FilePanelPlugin,
  ForkYDocPlugin,
  FormattingToolbarExtension,
  HistoryExtension,
  LinkToolbarPlugin,
  NodeSelectionKeyboardPlugin,
  PlaceholderPlugin,
  PreviousBlockTypePlugin,
  SchemaMigrationPlugin,
  ShowSelectionPlugin,
  SideMenuProsemirrorPlugin,
  SuggestionMenuPlugin,
  SyncPlugin,
  TableHandlesPlugin,
  TrailingNode,
  UndoPlugin,
] as const;
