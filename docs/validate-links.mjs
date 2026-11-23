import { getTableOfContents } from "fumadocs-core/content/toc";
import { getSlugs } from "fumadocs-core/source";
import {
  printErrors,
  readFileFromPath,
  scanURLs,
  validateFiles,
} from "next-validate-link";
import { glob } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { examplePage } from "../packages/dev-scripts/examples/examplePage.ts";
import { getExampleProjects } from "../packages/dev-scripts/examples/util.ts";

const docsRoot = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(docsRoot, "content");

async function readContentFiles(pattern) {
  const files = await Array.fromAsync(glob(pattern, { cwd: contentRoot }));
  return Promise.all(
    files.map((file) => readFileFromPath(path.join(contentRoot, file))),
  );
}

function routeEntries(section, files) {
  const sectionRoot = path.join(contentRoot, section);
  return files.map((file) => ({
    value: getSlugs(path.relative(sectionRoot, file.path)),
    hashes: getTableOfContents(file.content).map((item) => item.url.slice(1)),
  }));
}

async function checkLinks() {
  const docsFiles = await readContentFiles("docs/**/*.{md,mdx}");
  const pagesFiles = await readContentFiles("pages/**/*.{md,mdx}");
  // The site generator owns the subdirectories; don't read stale generated
  // pages from a previous checkout or build.
  const examplesFiles = await readContentFiles("examples/*.{md,mdx}");
  for (const project of getExampleProjects()) {
    if (project.config?.docs !== true) {
      continue;
    }
    const { filename, frontmatter, body } = examplePage(project);
    examplesFiles.push({
      path: path.join(contentRoot, "examples", filename),
      // Like readFileFromPath, preserve line numbers without parsing frontmatter
      // as Markdown. The validator only needs the path and Markdown content.
      content: frontmatter.replace(/[^\n]/g, "") + body,
    });
  }

  const scanned = await scanURLs({
    cwd: docsRoot,
    populate: {
      "[...slug]": routeEntries("pages", pagesFiles),
      "docs/[[...slug]]": routeEntries("docs", docsFiles),
      "examples/[[...slug]]": routeEntries("examples", examplesFiles),
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
