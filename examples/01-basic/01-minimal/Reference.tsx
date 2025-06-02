import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";
import "@citation-js/plugin-doi";
import { useFloating, useHover, useInteractions } from "@floating-ui/react";
import { useEffect, useState } from "react";

type Props = {
  inlineContent: {
    props: {
      key: number;
      doi: string;
      author: string;
      title: string;
      journal: string;
      year: number;
    };
  };
};

export const Reference = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bibliography, setBibliography] = useState("");

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const hover = useHover(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  useEffect(() => {
    Cite.async(props.inlineContent.props.doi).then((data) => {
      console.log("Cite data:", data);
      // Format output
      const bibliography = data.format("bibliography", {
        format: "html",
        template: "apa",
        lang: "en-US",
      });
      setBibliography(bibliography);
    });
  }, [props.inlineContent.props]);

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
          <div dangerouslySetInnerHTML={{ __html: bibliography }} />
        </div>
      )}
    </span>
  );
};
