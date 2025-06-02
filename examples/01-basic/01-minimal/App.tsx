import {
  BlockNoteSchema,
  defaultInlineContentSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactInlineContentSpec,
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  useComponentsContext,
  useCreateBlockNote,
  useEditorSelectionChange,
} from "@blocknote/react";
import { useEffect, useRef, useState } from "react";

import "./style.css";

export const Reference = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      doi: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      // const [reference, setReference] = useState<any>(undefined);

      // const Components = useComponentsContext()!;

      // useEffect(() => {
      //   setTimeout(
      //     () =>
      //       setReference({
      //         type: "article",
      //         label: "Vaswani2017Attention",
      //         properties: {
      //           author:
      //             "Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N. and Kaiser, Lukasz and Polosukhin, Illia",
      //           doi: "10.48550/ARXIV.1706.03762",
      //           year: "2017",
      //           publisher: "arXiv",
      //           title: "Attention {Is} {All} {You} {Need}",
      //           url: "https://arxiv.org/abs/1706.03762",
      //         },
      //       }),
      //     500,
      //   );
      // }, [setReference]);

      // const firstAuthor = reference
      //   ? reference.properties.author.split(",")[0]
      //   : "";

      // if (!props.inlineContent.props.doi) {
      //   return <button></button>;
      // }

      // return (
      //   <span style={{ color: "#8400ff33" }}>
      //     {reference ? (
      //       `(${firstAuthor}, ${reference.properties.year})`
      //     ) : (
      //       <Components.SuggestionMenu.Loader />
      //     )}
      //   </span>
      // );

      const [open, setOpen] = useState(false);

      const Components = useComponentsContext()!;

      const [doi, setDoi] = useState("");
      console.log(doi);

      const handleClick = () => {
        props.updateInlineContent({
          type: "reference",
          props: {
            doi,
          },
        });
      };

      useEditorSelectionChange(() => setOpen(false));

      // useEffect(() => {
      //   const blurHandler = (event: FocusEvent) => {
      //     if (ref.current && ref.current.contains(event.target as Node)) {
      //       return;
      //     }

      //     setOpen(false);
      //   };
      //   document.addEventListener("focus", blurHandler);

      //   return () => {
      //     props.editor.domElement?.removeEventListener("focus", blurHandler);
      //   };
      // }, [props.editor.domElement]);

      const ref = useRef<HTMLSpanElement>(null);

      return (
        <span ref={ref}>
          <span
            style={{
              border: "1px solid red",
              cursor: "pointer",
              position: "absolute",
            }}
            onClick={() => setOpen(!open)}
          >
            Add DOI
          </span>
          {open && (
            <Components.FilePanel.Root
              className={"bn-panel lower"}
              tabs={[
                {
                  name: "DOI",
                  tabPanel: (
                    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
                      <Components.FilePanel.TextInput
                        className={"bn-text-input"}
                        placeholder={"Enter DOI"}
                        value={doi}
                        onChange={(e) => setDoi(e.target.value)}
                        onKeyDown={handleClick}
                        data-test={"embed-input"}
                      />
                      <Components.FilePanel.Button
                        className={"bn-button"}
                        onClick={handleClick}
                        data-test="embed-input-button"
                      >
                        Add reference from DOI
                      </Components.FilePanel.Button>
                    </Components.FilePanel.TabPanel>
                  ),
                },
              ]}
              openTab="DOI"
              setOpenTab={() => {}}
              defaultOpenTab="DOI"
              loading={false}
            />
          )}
        </span>
      );
    },
  },
);

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    reference: Reference,
  },
});

// const getReferenceMenuItems = (
//   editor: typeof schema.BlockNoteEditor,
// ): DefaultReactSuggestionItem[] => {
//   const users = ["Steve", "Bob", "Joe", "Mike"];

//   return users.map((user) => ({
//     title: user,
//     onItemClick: () => {
//       editor.insertInlineContent([
//         {
//           type: "mention",
//           props: {
//             user,
//           },
//         },
//         " ", // add a space after the mention
//       ]);
//     },
//   }));
// };

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            type: "reference",
            doi: "10.48550/ARXIV.1706.03762",
          },
        ],
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor}>
      {/* Adds a mentions menu which opens with the "@" key */}
      <SuggestionMenuController
        triggerCharacter={"\\"}
        getItems={async (query) => []}
        suggestionMenuComponent={() => {
          const Components = useComponentsContext()!;

          const [doi, setDoi] = useState("");

          const handleClick = () => {
            editor.insertInlineContent([
              {
                type: "reference",
                props: {
                  doi,
                },
              },
              "",
            ]);
          };

          return (
            <Components.FilePanel.Root
              tabs={[
                {
                  name: "DOI",
                  tabPanel: (
                    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
                      <Components.FilePanel.TextInput
                        className={"bn-text-input"}
                        placeholder={"Enter DOI"}
                        value={doi}
                        onChange={(e) => setDoi(e.target.value)}
                        onKeyDown={handleClick}
                        data-test={"embed-input"}
                      />
                      <Components.FilePanel.Button
                        className={"bn-button"}
                        onClick={handleClick}
                        data-test="embed-input-button"
                      >
                        Add reference from DOI
                      </Components.FilePanel.Button>
                    </Components.FilePanel.TabPanel>
                  ),
                },
              ]}
              openTab="DOI"
              setOpenTab={() => {}}
              defaultOpenTab="DOI"
              loading={false}
            ></Components.FilePanel.Root>
          );
        }}
      />
    </BlockNoteView>
  );
}
