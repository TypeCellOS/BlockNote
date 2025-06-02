import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  BlockNoteEditor,
} from "@blocknote/core";
import { RiFileListFill, RiLink } from "react-icons/ri";

export const getBibliographyReactSlashMenuItems = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
) => [
  {
    title: "Reference",
    subtext: "Reference to a bibliography block source",
    icon: <RiLink size={18} />,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: "reference",
        } as any,
      ]);
    },
  },
  {
    title: "Bibliography",
    subtext: "Insert a bibliography block",
    icon: <RiFileListFill size={18} />,
    onItemClick: () => {
      editor.insertBlocks(
        [
          {
            type: "bibliography",
          },
        ],
        editor.document[editor.document.length - 1],
        "after",
      );
    },
  },
];
