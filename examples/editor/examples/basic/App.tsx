import {
  defaultInlineContentSchema,
  defaultInlineContentSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY
} from "@blocknote/core";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  createReactInlineContentSpec,
  DefaultPositionedSuggestionMenu,
  filterSuggestionItems,
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
  
  query: string
) {
  const users = ["Steve", "Bob", "Joe", "Mike"];
  const items = users.map((user) => ({
    title: user,

    aliases: [] as string[],
  }));

  return filterSuggestionItems(items, query);
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
        getItems={async (query) => getMentionMenuItems(query)}
        onItemClick={(item) => {
          editor._tiptapEditor.commands.insertContent({
            type: "mention",
            attrs: {
              user: item.title,
            },
          });
        }}
      />
    </BlockNoteView>
  );
}

export default App;
