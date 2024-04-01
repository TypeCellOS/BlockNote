import {
  BlockNoteSchema,
  createStyleSpec,
  defaultStyleSpecs,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteView,
  FormattingToolbar,
  FormattingToolbarController,
  FormattingToolbarProps,
  ToolbarButton,
  useActiveStyles,
  useBlockNoteEditor,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

const small = createStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: () => {
      const small = document.createElement("small");

      return {
        dom: small,
        contentDOM: small,
      };
    },
  }
);

const fontSize = createStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (value) => {
      const span = document.createElement("span");
      span.style.fontSize = value;

      return {
        dom: span,
        contentDOM: span,
      };
    },
  }
);

const schema = BlockNoteSchema.create({
  styleSpecs: {
    ...defaultStyleSpecs,
    small,
    fontSize,
  },
});

const CustomFormattingToolbar = (props: FormattingToolbarProps) => {
  const editor = useBlockNoteEditor(schema);
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
  const editor = useCreateBlockNote(
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
    <BlockNoteView className="root" editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
