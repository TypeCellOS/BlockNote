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
  DefaultSlashMenu,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  TableHandlesPositioner,
  useBlockNote,
  useSuggestionMenu,
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

async function getMentionMenuItems(query: string) {
  const users = ["Steve", "Bob", "Joe", "Mike"];
  const items = users.map((user) => ({
    name: user,
    execute: (
      editor: BlockNoteEditor<
        DefaultBlockSchema,
        typeof customInlineContentSchema,
        DefaultStyleSchema
      >
    ) => {
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

function MentionMenu(props: {
  editor: BlockNoteEditor<
    DefaultBlockSchema,
    typeof customInlineContentSchema,
    DefaultStyleSchema
  >;
}) {
  const { isMounted, suggestionMenuProps, positionerProps } = useSuggestionMenu(
    props.editor,
    "@"
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div ref={positionerProps.ref} style={positionerProps.styles}>
      <DefaultSlashMenu
        editor={props.editor}
        getItems={getMentionMenuItems}
        {...suggestionMenuProps}
      />
    </div>
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
    extraSuggestionMenus: [
      {
        name: "mentions",
        triggerCharacter: "@",
        getItems: getMentionMenuItems,
      },
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView className="root" editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} />
      {editor.blockSchema.table && (
        <TableHandlesPositioner editor={editor as any} />
      )}
      {/* TODO: add high level API? */}
      <MentionMenu editor={editor} />
    </BlockNoteView>
  );
}

export default App;
