import { getPageTreePeers } from "fumadocs-core/server";
import { Cards, Card } from "fumadocs-ui/components/card";
import { source } from "@/lib/source/docs";

export function DocsCardTable({ path }: { path: string }) {
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, `/docs/${path}`).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}
