import { useEffect } from "react";
import { defaultBlockSchema, BlockSchema } from "@blocknote/core";
import { BlockNoteView, useBlockNote, createReactBlockSpec, getDefaultReactSlashMenuItems, ReactSlashMenuItem } from "@blocknote/react";

import "@blocknote/core/style.css";
import styles from "./App.module.css";

const CustomBlock = createReactBlockSpec({
  type: 'custom',
  propSchema: {
    label: {
      default: 'Default Label',
    },
    testBoolean: {
      default: false,
    },
    autoLayout: {
      default: {
        enabled: false,
        deep: {
          nested: {
            value: 'Default Value',
            creepyArray: ['why', 'would', 'someone', 'do', 'this', '?']
          }
        }
      }
    }
  },
  render: ({ editor, block }) => {
    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            autoLayout: {
              ...block.props.autoLayout,
              enabled: true
            }
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            testBoolean: true
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            autoLayout: {
              ...block.props.autoLayout,
              deep: {
                nested: {
                  ...block.props.autoLayout.deep.nested,
                  value: 'Updated Value 2222'
                }
              }
            }
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            label: 'Updated Label'
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    return (
      <>
        <h2>{block.props.label}</h2>

        {
          block.props.autoLayout?.enabled ? 
            (
              <div>
                Enabled
              </div>
            ) : 
          <></>
        }

        {
          block.props.testBoolean ? 
            (
              <div>
                Should render
              </div>
            ) : 
          <></>
        }


        <div>
          {block.props.autoLayout?.deep?.nested?.value}

          <div 
            style={{
              display: "grid",
              gap: "1rem",
            }}
          > 
            {block.props.autoLayout?.deep?.nested?.creepyArray.map((item, index) => (
              <span key={index}>{item}</span>
            ))}
          </div>
        </div>
      </>
    );
  },
  containsInlineContent: true,
});

const customSchema = {
  ...defaultBlockSchema,
  custom: CustomBlock,
} satisfies BlockSchema;

const custom: ReactSlashMenuItem<typeof customSchema> = {
  name: 'Insert Custom',
  execute: (editor) => {
    editor.insertBlocks(
      [
        {
          type: 'custom',
        },
      ],
      editor.getTextCursorPosition().block,
      'before'
    );
  },
  aliases: ["custom"],
  group: "Containers",
  icon: <>+</>,
  hint: 'Nice hint.',
};


type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    blockSchema: customSchema,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(customSchema),
      custom,
    ],
    theme: "dark",
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
