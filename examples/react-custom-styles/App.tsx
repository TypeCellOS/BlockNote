import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  StyleSchemaFromSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  Toolbar,
  ToolbarButton,
  createReactStyleSpec,
  useActiveStyles,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

const small = createReactStyleSpec(
  {
    type: "small" as const,
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
    type: "fontSize" as const,
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

const customReactStyles = {
  ...defaultStyleSpecs,
  small,
  fontSize,
};

type MyEditorType = BlockNoteEditor<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  StyleSchemaFromSpecs<typeof customReactStyles>
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

export default function App() {
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

  return (
    <BlockNoteView className="root" editor={editor}>
      <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
