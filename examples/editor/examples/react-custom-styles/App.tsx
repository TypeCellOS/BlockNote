import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  defaultStyleSpecs,
} from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  createReactStyleSpec,
  FormattingToolbarPositioner,
  Toolbar,
  ToolbarButton,
  useActiveStyles,
  useBlockNote,
} from "@blocknote/react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const small = createReactStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: (props) => {
      return <small ref={props.contentRef}></small>;
    },
  }
);

const fontSize = createReactStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (props) => {
      return (
        <span ref={props.contentRef} style={{ fontSize: props.value }}></span>
      );
    },
  }
);

type MyEditorType = BlockNoteEditor<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  {
    small: (typeof small)["config"];
    fontSize: (typeof fontSize)["config"];
  }
>;

const CustomFormattingToolbar = (props: { editor: MyEditorType }) => {
  const activeStyles = useActiveStyles(props.editor);

  return (
    <Toolbar>
      <ToolbarButton
        mainTooltip={"small"}
        onClick={() => {
          props.editor.toggleStyles({
            small: true,
          });
        }}
        isSelected={activeStyles.small}>
        Small
      </ToolbarButton>
      <ToolbarButton
        mainTooltip={"font size"}
        onClick={() => {
          props.editor.toggleStyles({
            fontSize: "30px",
          });
        }}
        isSelected={!!activeStyles.fontSize}>
        Font size
      </ToolbarButton>
    </Toolbar>
  );
};

const customReactStyles = {
  ...defaultStyleSpecs,
  small,
  fontSize,
};

export function ReactStyles() {
  const editor = useBlockNote(
    {
      styleSpecs: customReactStyles,
      onEditorContentChange: (editor) => {
        console.log(editor.topLevelBlocks);
      },
      domAttributes: {
        editor: {
          class: "editor",
          "data-test": "editor",
        },
      },
      initialContent: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "large text",
              styles: {
                fontSize: "30px",
              },
            },
            {
              type: "text",
              text: "small text",
              styles: {
                small: true,
              },
            },
          ],
        },
      ],
    },
    []
  );

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView className="root" editor={editor}>
      <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
