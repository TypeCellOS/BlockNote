import { source } from "@/lib/source/examples";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Heading } from "fumadocs-ui/components/heading";
import { examplesMeta } from "@/.source";
import { useMemo } from "react";

type CardData = {
  title: string;
  author: string;
  href: string;
};

type CardGroupData = {
  groupName: string;
  cards: CardData[];
};

export function ExampleCards() {
  // Creates card groups in the order the example & example categories appear
  // in the sidebar (i.e. from `meta.json` files in the `content/examples`
  // directory).
  const cardGroups = useMemo<CardGroupData[]>(() => {
    // Indexes all example pages by their URL.
    const pagesByUrl = Object.fromEntries(
      source.getPages().map((page) => [page.url, page]),
    );

    // Gets metadata for root examples directory.
    const rootMeta =
      examplesMeta[
        examplesMeta.findIndex((meta) => {
          return meta.root;
        })
      ];

    return (
      rootMeta.pages
        // Filters out the page showing all examples.
        .filter((exampleCategoryName) => exampleCategoryName !== "index")
        // Maps each example category to a `CardGroupData` object.
        .map((exampleCategoryName) => {
          // Gets metadata for the example category directory ("basic",
          // "collaboration", "theming", etc).
          const exampleMeta = examplesMeta.find(
            (exampleMeta) =>
              exampleMeta._file.path.replace("/meta.json", "") ===
              exampleCategoryName,
          )!;

          return {
            groupName: exampleMeta.title,
            // Maps each example in the category to a `CardData` object.
            cards: (exampleMeta.pages || []).map((exampleName) => {
              // Gets the page for the example by its URL, which contains the
              // example URL and frontmatter data (title & author).
              const page =
                pagesByUrl[`/examples/${exampleCategoryName}/${exampleName}`];

              return {
                title: page.data.title,
                author: page.data.author!,
                href: page.url,
              };
            }),
          };
        })
    );
  }, []);

  return (
    <>
      {cardGroups.map((group) => (
        <>
          <Heading key={group.groupName}>{group.groupName}</Heading>
          <Cards key={group.groupName} className="mb-8">
            {group.cards.map((card) => (
              <Card
                key={card.href}
                icon={
                  card.author ? (
                    <img
                      src={`https://github.com/${card.author}.png`}
                      alt={card.author}
                      width={32}
                    />
                  ) : undefined
                }
                title={card.title}
                description={card.author ? `by ${card.author}` : undefined}
                href={card.href}
              />
            ))}
          </Cards>
        </>
      ))}
    </>
  );
}
