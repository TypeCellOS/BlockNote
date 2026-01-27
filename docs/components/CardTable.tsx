import { getPageTreePeers } from "fumadocs-core/page-tree";
import { LoaderOutput } from "fumadocs-core/source";
import { Card, Cards } from "fumadocs-ui/components/card";

export function CardTable({
  path,
  source,
}: {
  path: string;
  source: LoaderOutput<{ i18n: any; source: any }>;
}) {
  const peers = getPageTreePeers(
    source.pageTree,
    `/docs/${path.startsWith("/") ? path.slice(1) : path}`,
  );
  if (!peers.length) {
    throw new Error("No peers found, wrong path passed to CardTable?");
  }

  return (
    <Cards className="mb-48">
      {peers.map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}
