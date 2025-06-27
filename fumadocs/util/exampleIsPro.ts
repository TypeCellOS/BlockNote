import { examples } from "@/.source";

export function exampleIsPro(name: string) {
  return (
    examples.docs.find(
      (example) => example._file.path.replace(/\.mdx$/, "") === name,
    )?.isPro || false
  );
}
