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
  const [bibliography, setBibliography] = useState<any>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const hover = useHover(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  useEffect(() => {
    Cite.async(props.inlineContent.props.doi).then(setBibliography);
  }, [props.inlineContent.props]);

  if (!bibliography) {
    return <span>Loading...</span>;
  }

  return (
    <span>
      <span ref={refs.setReference} {...getReferenceProps()}>
        {bibliography.format("citation")}
      </span>
      {isOpen && (
        <div
          className="floating"
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
        >
          {/* FIXME do not use `dangerouslySetInnerHTML` to embed citation */}
          <div
            dangerouslySetInnerHTML={{
              __html: bibliography.format("bibliography"),
            }}
          />
        </div>
      )}
    </span>
  );
};
