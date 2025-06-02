import {
  BlockConfig,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { RiFileListFill } from "react-icons/ri";

export const bibliographyBlockConfig = {
  type: "bibliography",
  propSchema: {
    bibTexJSON: {
      default: "[]",
    },
  },
  content: "none",
  isSelectable: false,
} as const satisfies BlockConfig;

export type BibliographyBlockConfig = typeof bibliographyBlockConfig;

export const BibliographyBlockContent = createReactBlockSpec(
  bibliographyBlockConfig,
  {
    render: () => {
      return (
        <div>
          <h2>Bibliography</h2>
          <p>This is where your bibliography will be displayed.</p>
        </div>
      );
    },
  },
);

export const getInsertBibliographyBlockSlashMenuItem = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
) => ({
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
});
