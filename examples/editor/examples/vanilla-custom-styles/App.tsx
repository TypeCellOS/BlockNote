import {
  BlockNoteEditor,
  createStyleSpec,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  defaultStyleSpecs,
} from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  Toolbar,
  ToolbarButton,
  useActiveStyles,
  useBlockNote,
} from "@blocknote/react";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

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

export function Styles() {
  const editor = useBlockNote(
    {
      styleSpecs: {
        ...defaultStyleSpecs,
        small,
        fontSize,
      },
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
