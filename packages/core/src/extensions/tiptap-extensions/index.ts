import { BackgroundColorExtension } from "./BackgroundColor/BackgroundColorExtension.js";
import { HardBreak } from "./HardBreak/HardBreak.js";
import { KeyboardShortcutsExtension } from "./KeyboardShortcuts/KeyboardShortcutsExtension.js";
import {
  SuggestionAddMark,
  SuggestionDeleteMark,
  SuggestionModificationMark,
} from "./Suggestions/SuggestionMarks.js";
import { TextAlignmentExtension } from "./TextAlignment/TextAlignmentExtension.js";
import { TextColorExtension } from "./TextColor/TextColorExtension.js";
import { UniqueID } from "./UniqueID/UniqueID.js";

export * from "./BackgroundColor/BackgroundColorExtension.js";
export * from "./HardBreak/HardBreak.js";
export * from "./KeyboardShortcuts/KeyboardShortcutsExtension.js";
export * from "./Suggestions/SuggestionMarks.js";
export * from "./TextAlignment/TextAlignmentExtension.js";
export * from "./TextColor/TextColorExtension.js";
export * from "./UniqueID/UniqueID.js";

export const DEFAULT_TIP_TAP_EXTENSIONS = [
  BackgroundColorExtension,
  HardBreak,
  KeyboardShortcutsExtension,
  SuggestionAddMark,
  SuggestionDeleteMark,
  SuggestionModificationMark,
  TextAlignmentExtension,
  TextColorExtension,
  UniqueID,
];
