import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import {
  BlockNoteView,
  FormattingToolbar,
  FormattingToolbarController,
  FormattingToolbarProps,
  ToolbarButton,
  createReactStyleSpec,
  useActiveStyles,
  useBlockNote,
  useBlockNoteEditor,
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

export const schema = BlockNoteSchema.create({
  styleSpecs: {
    ...defaultStyleSpecs,
    small,
    fontSize,
  },
});

const CustomFormattingToolbar = (props: FormattingToolbarProps) => {
  const editor = useBlockNoteEditor();
  const activeStyles = useActiveStyles(editor);

  return (
    <FormattingToolbar>
      <ToolbarButton
        mainTooltip={"small"}
        onClick={() => {
          editor.toggleStyles({
            small: true,
          });
        }}
        isSelected={activeStyles.small}>
        Small
      </ToolbarButton>
      <ToolbarButton
        mainTooltip={"font size"}
        onClick={() => {
          editor.toggleStyles({
            fontSize: "30px",
          });
        }}
        isSelected={!!activeStyles.fontSize}>
        Font size
      </ToolbarButton>
    </FormattingToolbar>
  );
};

export default function App() {
  const editor = useBlockNote(
    {
      schema,
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
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
