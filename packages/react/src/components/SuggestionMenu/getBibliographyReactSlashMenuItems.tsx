import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  BlockNoteEditor,
  checkBlockTypeInSchema,
  checkInlineContentTypeInSchema,
} from "@blocknote/core";
import { RiFileListFill, RiLink } from "react-icons/ri";
import { DefaultReactSuggestionItem } from "./types.js";
import { referenceInlineContentConfig } from "../../inlineContent/ReferenceInlineContent/ReferenceInlineContent.js";
import { bibliographyBlockConfig } from "../../blocks/BibliographyBlockContent/BibliographyBlockContent.js";

export const getBibliographyReactSlashMenuItems = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
) => {
  const items: DefaultReactSuggestionItem[] = [];

  if (
    checkInlineContentTypeInSchema(
      "reference",
      referenceInlineContentConfig,
      editor,
    )
  ) {
    items.push({
      title: "Reference",
      subtext: "Reference to a bibliography block source",
      icon: <RiLink size={18} />,
      aliases: ["ciataion", "cite", "bib"],
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: "reference",
          },
        ]);
      },
    });
  }

  const bibliographyBlockInSchema = checkBlockTypeInSchema(
    "bibliography",
    bibliographyBlockConfig,
    editor,
  );
  let bibliographyBlockAlreadyExists = false;
  editor.forEachBlock((block) => {
    if (block.type === "bibliography") {
      bibliographyBlockAlreadyExists = true;
      return false;
    }
    return true;
  });

  if (bibliographyBlockInSchema && !bibliographyBlockAlreadyExists) {
    items.push({
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
  }

  return items;
};
