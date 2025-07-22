import { getTableOfContents } from "fumadocs-core/server";
import { getSlugs, parseFilePath } from "fumadocs-core/source";
import {
  printErrors,
  readFiles,
  scanURLs,
  validateFiles,
} from "next-validate-link";
import path from "node:path";

async function checkLinks() {
  // we read them all at once to avoid repeated file read
  const docsFiles = await readFiles("content/docs/**/*.{md,mdx}");

  // other collections too!
  //   const blogFiles = await readFiles("../../docs/content/blog/**/*.{md,mdx}");

  const scanned = await scanURLs({
    // cwd: "../../docs/",
    populate: {
      //   "(home)/blog/[slug]": blogFiles.map((file) => {
      //     const info = parseFilePath(path.relative("content/blog", file.path));

      //     return {
      //       value: getSlugs(info)[0],
      //       hashes: getTableOfContents(file.content).map((item) =>
      //         item.url.slice(1),
      //       ),
      //     };
      //   }),
      "docs/[[...slug]]": docsFiles.map((file) => {
        const info = parseFilePath(path.relative("content/docs", file.path));

        return {
          value: getSlugs(info),
          hashes: getTableOfContents(file.content).map((item) =>
            item.url.slice(1),
          ),
        };
      }),
    },
  });

  printErrors(
    await validateFiles([...docsFiles], {
      scanned,
    }),
    true,
  );
}

void checkLinks();
