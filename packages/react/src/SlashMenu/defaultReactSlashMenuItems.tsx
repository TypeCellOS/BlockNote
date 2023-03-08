import { formatKeyboardShortcut } from "../utils";
import { defaultSlashCommands } from "@blocknote/core";
import { ReactSlashMenuItem } from "./ReactSlashMenuItem";

const extraFields = {
  Heading: {
    group: "Headings",
    hint: "Used for a top-level heading",
    shortcut: formatKeyboardShortcut("Mod-Alt-1"),
  },
  "Heading 2": {
    group: "Headings",
    hint: "Used for key sections",
    shortcut: formatKeyboardShortcut("Mod-Alt-2"),
  },
  "Heading 3": {
    group: "Headings",
    hint: "Used for subsections and group headings",
    shortcut: formatKeyboardShortcut("Mod-Alt-3"),
  },
  "Numbered List": {
    group: "Basic blocks",
    hint: "Used to display a numbered list",
    shortcut: formatKeyboardShortcut("Mod-Alt-7"),
  },
  "Bullet List": {
    group: "Basic blocks",
    hint: "Used to display an unordered list",
    shortcut: formatKeyboardShortcut("Mod-Alt-9"),
  },
  Paragraph: {
    group: "Basic blocks",
    hint: "Used for the body of your document",
    shortcut: formatKeyboardShortcut("Mod-Alt-0"),
  },
};

export const defaultReactSlashMenuItems: ReactSlashMenuItem[] =
  defaultSlashCommands.map(
    (item) =>
      new ReactSlashMenuItem(
        item.name,
        item.execute,
        item.aliases,
        extraFields[item.name].group,
        extraFields[item.name].hint,
        extraFields[item.name].shortcut
      )
  );
