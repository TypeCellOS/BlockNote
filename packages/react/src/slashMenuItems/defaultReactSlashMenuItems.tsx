import {
  BlockSchema,
  defaultBlockSchema,
  DefaultBlockSchema,
  getDefaultSlashMenuItems,
  InlineContentSchema,
  StyleSchema,
  SuggestionItem,
} from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiImage2Fill,
  RiListOrdered,
  RiListUnordered,
  RiTable2,
  RiText,
} from "react-icons/ri";
import { formatKeyboardShortcut } from "@blocknote/core";
import { ReactSlashMenuItem } from "./ReactSlashMenuItem";

const extraFields: Record<
  string,
  Omit<ReactSlashMenuItem, keyof SuggestionItem<DefaultBlockSchema, any, any>>
> = {
  Heading: {
    group: "Headings",
    icon: <RiH1 size={18} />,
    hint: "Used for a top-level heading",
    shortcut: formatKeyboardShortcut("Mod-Alt-1"),
  },
  "Heading 2": {
    group: "Headings",
    icon: <RiH2 size={18} />,
    hint: "Used for key sections",
    shortcut: formatKeyboardShortcut("Mod-Alt-2"),
  },
  "Heading 3": {
    group: "Headings",
    icon: <RiH3 size={18} />,
    hint: "Used for subsections and group headings",
    shortcut: formatKeyboardShortcut("Mod-Alt-3"),
  },
  "Numbered List": {
    group: "Basic blocks",
    icon: <RiListOrdered size={18} />,
    hint: "Used to display a numbered list",
    shortcut: formatKeyboardShortcut("Mod-Alt-7"),
  },
  "Bullet List": {
    group: "Basic blocks",
    icon: <RiListUnordered size={18} />,
    hint: "Used to display an unordered list",
    shortcut: formatKeyboardShortcut("Mod-Alt-9"),
  },
  Paragraph: {
    group: "Basic blocks",
    icon: <RiText size={18} />,
    hint: "Used for the body of your document",
    shortcut: formatKeyboardShortcut("Mod-Alt-0"),
  },
  Table: {
    group: "Advanced",
    icon: <RiTable2 size={18} />,
    hint: "Used for for tables",
    // shortcut: formatKeyboardShortcut("Mod-Alt-0"),
  },
  Image: {
    group: "Media",
    icon: <RiImage2Fill />,
    hint: "Insert an image",
  },
};

export async function getDefaultReactSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  query: string,
  // This type casting is weird, but it's the best way of doing it, as it allows
  // the schema type to be automatically inferred if it is defined, or be
  // inferred as any if it is not defined. I don't think it's possible to make it
  // infer to DefaultBlockSchema if it is not defined.
  schema: BSchema = defaultBlockSchema as any as BSchema
): Promise<ReactSlashMenuItem<BSchema, I, S>[]> {
  const slashMenuItems: SuggestionItem<BSchema, I, S>[] =
    await getDefaultSlashMenuItems(query, schema);

  return slashMenuItems.map((item) => ({
    ...item,
    ...extraFields[item.name],
  }));
}
