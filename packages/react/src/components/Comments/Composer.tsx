import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { useCreateBlockNote } from "@blocknote/react";
import {
  ComponentProps,
  useComponentsContext,
} from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../i18n/dictionary.js";

type PanelProps = ComponentProps["FilePanel"]["Root"];

// TODO: disable props on paragraph
const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
  },
});

/**
 * By default, the FilePanel component will render with default tabs. However,
 * you can override the tabs to render by passing the `tabs` prop. You can use
 * the default tab panels in the `DefaultTabPanels` directory or make your own
 * using the `FilePanelPanel` component.
 */
export const Composer = () => {
  const dict = useDictionary();
  const editor = useBlockNoteEditor();

  const commentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        ...dict.placeholders,
        default: "Write a comment...", // TODO: only for empty doc
      },
    },
    schema,
  });

  const components = useComponentsContext()!;

  return (
    <components.Comments.Composer
      className="bn-comment-composer"
      editor={commentEditor}
      onSubmit={() => {
        editor.comments!.createThread({
          body: editor.document,
        });
      }}
    />
  );
};
