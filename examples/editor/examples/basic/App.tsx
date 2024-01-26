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
  BlockNoteView,
  createReactInlineContentSpec,
  DefaultPositionedSuggestionMenu,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SuggestionMenuItemProps,
  TableHandlesPositioner,
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
): Promise<SuggestionMenuItemProps[]> {
  const users = ["Steve", "Bob", "Joe", "Mike"];
  const items: SuggestionMenuItemProps[] = users.map((user) => ({
    text: user,
    executeItem: () => {
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
    ({ text, aliases }) =>
      text.toLowerCase().startsWith(query.toLowerCase()) ||
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

  return (
    <BlockNoteView className="root" editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <DefaultPositionedSuggestionMenu editor={editor} />
      <ImageToolbarPositioner editor={editor} />
      {editor.blockSchema.table && (
        <TableHandlesPositioner editor={editor as any} />
      )}
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
