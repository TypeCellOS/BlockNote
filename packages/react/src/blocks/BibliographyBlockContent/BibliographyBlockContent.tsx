import { BlockConfig } from "@blocknote/core";
// @ts-ignore
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";
import "@citation-js/plugin-doi";
import { useState, useEffect } from "react";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";

export const bibliographyBlockConfig = {
  type: "bibliography",
  propSchema: {
    bibTexJSON: {
      default: "[]",
    },
  },
  content: "none",
  isSelectable: false,
} as const satisfies BlockConfig;

export const Bibliography = (
  props: ReactCustomBlockRenderProps<typeof bibliographyBlockConfig, any, any>,
) => {
  const [bibliography, setBibliography] = useState<any>([]);

  useEffect(() => {
    async function fetchBibliography() {
      const dois: string[] = JSON.parse(props.block.props.bibTexJSON);
      const cites = await Promise.all(dois.map((doi) => Cite.async(doi)));

      setBibliography(cites);
    }

    fetchBibliography();
  }, [props.block.props.bibTexJSON]);

  return (
    <div>
      <h2>Bibliography</h2>
      {bibliography.map((cite: any) => (
        <div key={cite.id}>{cite.format("bibliography")}</div>
      ))}
    </div>
  );
};

export const ReactBibliographyBlockContent = createReactBlockSpec(
  bibliographyBlockConfig,
  { render: Bibliography },
);
