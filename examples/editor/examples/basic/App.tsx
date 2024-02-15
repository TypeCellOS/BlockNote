import {
  BlockNoteEditor,
  DefaultBlockSchema,
  defaultInlineContentSchema,
  defaultInlineContentSpecs,
  DefaultStyleSchema,
  InlineContentSchema,
  InlineContentSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  createReactInlineContentSpec,
  DefaultPositionedSuggestionMenu,
  MantineSuggestionMenuItemProps,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const MentionInlineContent = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      user: {
        default: "Unknown",
      },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span style={{ backgroundColor: "#8400ff33" }}>
        @{props.inlineContent.props.user}
      </span>
    ),
  }
);

const customInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  mention: MentionInlineContent,
} satisfies InlineContentSpecs;
const customInlineContentSchema = {
  ...defaultInlineContentSchema,
  mention: MentionInlineContent.config,
} satisfies InlineContentSchema;

async function getMentionMenuItems(
  editor: BlockNoteEditor<
    DefaultBlockSchema,
    typeof customInlineContentSchema,
    DefaultStyleSchema
  >,
  query: string,
  closeMenu: () => void,
  clearQuery: () => void
): Promise<MantineSuggestionMenuItemProps[]> {
  const users = ["Steve", "Bob", "Joe", "Mike"];
  const items: MantineSuggestionMenuItemProps[] = users.map((user) => ({
    name: user,
    execute: () => {
      closeMenu();
      clearQuery();

      editor._tiptapEditor.commands.insertContent({
        type: "mention",
        attrs: {
          user: user,
        },
      });
    },
    aliases: [] as string[],
  }));

  return items.filter(
    ({ name, aliases }) =>
      name.toLowerCase().startsWith(query.toLowerCase()) ||
      (aliases &&
        aliases.filter((alias) =>
          alias.toLowerCase().startsWith(query.toLowerCase())
        ).length !== 0)
  );
}

export function App() {
  const editor = useBlockNote({
    inlineContentSpecs: customInlineContentSpecs,
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  // TODO: Figure out cleaner API for adding/changing/removing menus & toolbars
  return (
    <BlockNoteView className="root" editor={editor}>
      <BlockNoteDefaultUI editor={editor} />
      <DefaultPositionedSuggestionMenu
        editor={editor}
        triggerCharacter={"@"}
        getItems={(query, closeMenu, clearQuery) =>
          getMentionMenuItems(editor, query, closeMenu, clearQuery)
        }
      />
    </BlockNoteView>
  );
}

export default App;
