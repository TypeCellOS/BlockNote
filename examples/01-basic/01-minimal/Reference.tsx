import { createReactInlineContentSpec } from "@blocknote/react";
import { useFloating, useHover, useInteractions } from "@floating-ui/react";
import { useState } from "react";
import "./styles.css";

export const Reference = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      key: {
        type: "number",
        default: 1,
        description: "The key for the reference.",
      },
      doi: {
        default: "Unknown",
      },
      author: {
        type: "string",
        default: "Unknown Author",
      },
      title: {
        type: "string",
        default: "Unknown Title",
      },
      journal: {
        type: "string",
        default: "Unknown Journal",
      },
      year: {
        type: "number",
        default: 2023,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const [isOpen, setIsOpen] = useState(false);

      const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
      });

      const hover = useHover(context);

      const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

      const citation = props.inlineContent.props;

      return (
        <span>
          <span ref={refs.setReference} {...getReferenceProps()}>
            [{citation.key}]
          </span>
          {isOpen && (
            <div
              className="floating"
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              {citation.author}, {citation.title}, {citation.year}
            </div>
          )}
        </span>
      );
    },
  },
);
