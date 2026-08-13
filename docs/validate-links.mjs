import path from "node:path";
import { fileURLToPath } from "node:url";

// The content globs below are cwd-relative, and the glob library captures
// `process.cwd()` when it is first imported - so pin the cwd to this
// script's directory *before* loading it (via dynamic imports; static
// imports would hoist above the chdir). Run from any other directory
// without this, the globs silently match zero files and report success.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const { getTableOfContents } = await import("fumadocs-core/content/toc");
const { getSlugs } = await import("fumadocs-core/source");
const { printErrors, readFiles, scanURLs, validateFiles } =
  await import("next-validate-link");

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
