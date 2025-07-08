import { getMDXComponents } from "@/util/mdx-components";
import { getPageTreePeers } from "fumadocs-core/server";
import { LoaderOutput } from "fumadocs-core/source";
import { Card, Cards } from "fumadocs-ui/components/card";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export function CardTable({
  path,
  source,
}: {
  path: string;
  source: LoaderOutput<{ i18n: false; source: any }>;
}) {
  return (
    <Cards>
      {getPageTreePeers(
        source.pageTree,
        `docs/${path.startsWith("/") ? path.slice(1) : path}`,
      ).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export async function DocPage(props: {
  params: Promise<{ slug?: string[] }>;
  source: LoaderOutput<any>;
}) {
  const params = await props.params;
  const page = props.source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  return (
    <DocsPage
      breadcrumb={{
        enabled: true,
        includeRoot: true,
        includePage: true,
        includeSeparator: true,
      }}
      // footer: null forces ToC to be visible with no items
      tableOfContent={{ style: "clerk", footer: null }}
      // Removes the ToC dropdown on mobile views. Have to pass an empty
      // element as `null` renders the default dropdown.
      tableOfContentPopover={{ component: <></> }}
      toc={page.data.toc}
      full={page.data.full}
      container={{
        // Slight hack to force uniform padding for viewport sizes where the
        // ToC is hidden but the sidebar is still visible.
        className: "*:md:px-12! *:md:pt-12!",
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            // @ts-ignore
            a: createRelativeLink(props.source, page),
            CardTable: (cardProps: any) => (
              <CardTable source={props.source} {...cardProps} />
            ),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
