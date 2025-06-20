import { BlockConfig } from "@blocknote/core";
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
  const [sources, setSources] = useState<any>([]);

  useEffect(() => {
    async function fetchBibliography() {
      const dois: string[] = JSON.parse(props.block.props.bibTexJSON);

      const data = await Promise.all(
        dois
          .filter((source) => source)
          .map((doi) =>
            fetch(`https://api.datacite.org/dois/${doi}`).then((res) =>
              res.json(),
            ),
          ),
      );

      setSources(data.filter((source) => source));
    }

    fetchBibliography();
  }, [props.block.props.bibTexJSON]);

  // console.log(sources);

  return (
    <div>
      <h2>Bibliography</h2>
      {sources.map((source: any) => (
        <div key={source.data.attributes.doi}>{source.data.attributes.doi}</div>
      ))}
    </div>
  );
};

export const ReactBibliographyBlockContent = createReactBlockSpec(
  bibliographyBlockConfig,
  { render: Bibliography },
);
