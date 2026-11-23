import path from "node:path";
import { fileURLToPath } from "node:url";
import { examplePage } from "../packages/dev-scripts/examples/examplePage.ts";

// The content globs below are cwd-relative, and the glob library captures
// `process.cwd()` when it is first imported - so pin the cwd to this
// script's directory *before* loading it (via dynamic imports; static
// imports would hoist above the chdir). Run from any other directory
// without this, the globs silently match zero files and report success.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const { getExampleProjects } =
  await import("../packages/dev-scripts/examples/util.ts");
const { getTableOfContents } = await import("fumadocs-core/content/toc");
const { getSlugs } = await import("fumadocs-core/source");
const { printErrors, readFiles, scanURLs, validateFiles } =
  await import("next-validate-link");

async function checkLinks() {
  const docsFiles = await readFiles("content/docs/**/*.{md,mdx}");
  const pagesFiles = await readFiles("content/pages/**/*.{md,mdx}");
  // The site generator owns the subdirectories; don't read stale generated
  // pages from a previous checkout or build.
  const examplesFiles = await readFiles("content/examples/*.{md,mdx}");
  for (const project of getExampleProjects()) {
    if (project.config?.docs !== true) {
      continue;
    }
    const { filename, frontmatter, body } = examplePage(project);
    examplesFiles.push({
      path: path.join("content/examples", filename),
      // Like readFiles, preserve source line numbers without parsing frontmatter
      // as Markdown. The validator only needs the path and Markdown content.
      content: frontmatter.replace(/[^\n]/g, "") + body,
    });
  }

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
