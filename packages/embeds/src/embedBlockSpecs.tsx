import {
  createReactBlockSpec,
  useExtension,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { EmbedExtension } from "./EmbedExtension.js";
import { RepresentationShell, SourceCard } from "./components.js";
import { bookmarkConfig, embedConfig } from "./types.js";
import { parseSourceUrl } from "./url.js";

function Bookmark({
  block,
}: ReactCustomBlockRenderProps<typeof bookmarkConfig>) {
  return (
    <RepresentationShell
      blockId={block.id}
      url={block.props.originalUrl}
      current="bookmark"
    >
      <SourceCard url={block.props.originalUrl} metadata={block.props} />
    </RepresentationShell>
  );
}
function Embed({ block }: ReactCustomBlockRenderProps<typeof embedConfig>) {
  const { options } = useExtension(EmbedExtension);
  const { originalUrl, providerId } = block.props;
  const source = parseSourceUrl(originalUrl);
  const provider = options.providers.find((value) => value.id === providerId);
  const Component =
    source && provider?.matches(source) ? provider.component : undefined;
  return (
    <RepresentationShell blockId={block.id} url={originalUrl} current="embed">
      {Component ? (
        <Component key={originalUrl} url={originalUrl} />
      ) : (
        <SourceCard url={originalUrl} unavailable />
      )}
    </RepresentationShell>
  );
}
// Static export never mounts providers or remote resources.
function External({ block }: { block: { props: { originalUrl: string } } }) {
  return parseSourceUrl(block.props.originalUrl) ? (
    <a href={block.props.originalUrl}>{block.props.originalUrl}</a>
  ) : (
    <span>{block.props.originalUrl}</span>
  );
}
export const embedBlockSpecs = {
  bookmark: createReactBlockSpec(bookmarkConfig, {
    render: Bookmark,
    toExternalHTML: External,
  })(),
  embed: createReactBlockSpec(embedConfig, {
    render: Embed,
    toExternalHTML: External,
  })(),
};
