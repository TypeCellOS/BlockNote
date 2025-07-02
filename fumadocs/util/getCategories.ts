export function getCategories(
  examples: typeof import("@/.source").examples,
  examplesMeta: typeof import("@/.source").examplesMeta,
) {
  return (
    examplesMeta
      .find((meta) => meta.root)
      ?.pages.filter((pageName) => pageName !== "index")
      .map((categoryName) => ({
        name: categoryName,
        examples:
          examplesMeta
            .find(
              (meta) =>
                meta._file.path.replace("/meta.json", "") === categoryName,
            )
            ?.pages.map((exampleName) => ({
              name: exampleName,
              isPro:
                examples.docs.find(
                  (doc) =>
                    doc._file.path.replace(/\.mdx$/, "") ===
                    `${categoryName}/${exampleName}`,
                )?.isPro || false,
            })) || [],
      })) || []
  );
}
