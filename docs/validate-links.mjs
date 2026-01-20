import { getTableOfContents } from "fumadocs-core/content/toc";
import { getSlugs } from "fumadocs-core/source";
import {
  printErrors,
  readFiles,
  scanURLs,
  validateFiles,
} from "next-validate-link";
import path from "node:path";
async function checkLinks() {
  const docsFiles = await readFiles("content/docs/**/*.{md,mdx}");
  const pagesFiles = await readFiles("content/pages/**/*.{md,mdx}");
  const examplesFiles = await readFiles("content/examples/**/*.{md,mdx}");

  const scanned = await scanURLs({
    populate: {
      "[...slug]": pagesFiles.map((file) => {
        return {
          value: getSlugs(path.relative("content/pages", file.path)),
          hashes: getTableOfContents(file.content).map((item) =>
            item.url.slice(1),
          ),
        };
      }),
      "docs/[[...slug]]": docsFiles.map((file) => {
        return {
          value: getSlugs(path.relative("content/docs", file.path)),
          hashes: getTableOfContents(file.content).map((item) =>
            item.url.slice(1),
          ),
        };
      }),
      "examples/[[...slug]]": examplesFiles.map((file) => {
        return {
          value: getSlugs(path.relative("content/examples", file.path)),
          hashes: getTableOfContents(file.content).map((item) =>
            item.url.slice(1),
          ),
        };
      }),
    },
  });
  printErrors(
    await validateFiles([...docsFiles, ...pagesFiles, ...examplesFiles], {
      scanned,
    }),
    true,
  );
}
void checkLinks();
