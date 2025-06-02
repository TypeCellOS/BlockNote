import {
  createReactInlineContentSpec,
  useComponentsContext,
} from "@blocknote/react";
import {
  useClick,
  // useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { useState } from "react";
import "./styles.css";
import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { RiLink } from "react-icons/ri";

import { BibliographyBlockConfig } from "./Bibliography";

const useFloatingHover = () => {
  const [isHovered, setIsHovered] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isHovered,
    onOpenChange: setIsHovered,
  });

  const hover = useHover(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return {
    isHovered,
    referenceElementProps: {
      ref: refs.setReference,
      ...getReferenceProps(),
    },
    floatingElementProps: {
      ref: refs.setFloating,
      style: floatingStyles,
      ...getFloatingProps(),
    },
  };
};

const useFloatingClick = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const open = useClick(context);
  // const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    open,
    // dismiss,
  ]);

  return {
    isOpen,
    referenceElementProps: {
      ref: refs.setReference,
      ...getReferenceProps(),
    },
    floatingElementProps: {
      ref: refs.setFloating,
      style: floatingStyles,
      ...getFloatingProps(),
    },
  };
};

export const Reference = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      key: {
        type: "number",
        default: 0,
      },
      doi: {
        default: "",
      },
      author: {
        type: "string",
        default: "",
      },
      title: {
        type: "string",
        default: "",
      },
      journal: {
        type: "string",
        default: "",
      },
      year: {
        type: "number",
        default: 0,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const Components = useComponentsContext()!;

      const referenceDetailsFloating = useFloatingHover();
      const referenceEditFloating = useFloatingClick();

      const citation = props.inlineContent.props;

      const [newDOI, setNewDOI] = useState(citation.doi);

      if (!citation.doi) {
        return (
          <span>
            <button {...referenceEditFloating.referenceElementProps}>
              Add Reference
            </button>
            {referenceEditFloating.isOpen && (
              <Components.FilePanel.Root
                className={"bn-panel reference-panel"}
                defaultOpenTab={"DOI"}
                openTab={"DOI"}
                setOpenTab={() => {}}
                tabs={[
                  {
                    name: "DOI",
                    tabPanel: (
                      <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
                        <Components.FilePanel.TextInput
                          className={"bn-text-input"}
                          placeholder={"Enter DOI"}
                          value={newDOI}
                          onChange={(e) => setNewDOI(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              props.updateInlineContent({
                                type: "reference",
                                props: {
                                  ...citation,
                                  doi: newDOI,
                                },
                              });
                            }
                          }}
                          data-test={"embed-input"}
                        />
                        <Components.FilePanel.Button
                          className={"bn-button"}
                          onClick={() => {
                            props.updateInlineContent({
                              type: "reference",
                              props: {
                                ...citation,
                                doi: newDOI,
                              },
                            });
                          }}
                          data-test="embed-input-button"
                        >
                          Update Reference
                        </Components.FilePanel.Button>
                      </Components.FilePanel.TabPanel>
                    ),
                  },
                ]}
                loading={false}
              />
            )}
          </span>
        );
      }

      return (
        <span>
          <span {...referenceDetailsFloating.referenceElementProps}>
            [{citation.key}]
          </span>
          {referenceDetailsFloating.isHovered && (
            <div
              className="floating"
              {...referenceDetailsFloating.floatingElementProps}
            >
              {citation.author}, {citation.title}, {citation.year}
            </div>
          )}
        </span>
      );
    },
  },
);

export const getInsertReferenceSlashMenuItem = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
) => ({
  title: "Reference",
  subtext: "Reference to a bibliography block source",
  icon: <RiLink size={18} />,
  onItemClick: () => {
    editor.insertInlineContent([
      {
        type: "reference",
      } as any,
    ]);

    let bibliographyBlock:
      | Block<
          BlockSchemaWithBlock<"bibliography", BibliographyBlockConfig>,
          I,
          S
        >
      | undefined = undefined;

    editor.forEachBlock((block) => {
      if (block.type === "bibliography") {
        bibliographyBlock = block as any;
      }

      if (bibliographyBlock) {
        return false;
      }

      return true;
    });

    if (!bibliographyBlock) {
      editor.insertBlocks(
        [
          {
            type: "bibliography",
          },
        ],
        editor.document[editor.document.length - 1],
        "after",
      );
    }
  },
});
