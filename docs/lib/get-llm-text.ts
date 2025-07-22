import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { remarkInstall } from "fumadocs-docgen";
import remarkMdx from "remark-mdx";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { remarkInclude } from "fumadocs-mdx/config";

const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkGfm)
  .use(remarkAutoTypeTable)
  .use(remarkInstall);

export type LLMData = {
  data: {
    title: string;
    description?: string;
    content: string;
    _file: {
      absolutePath: string;
    };
  };
  url: string;
  file: {
    path: string;
  };
};

// Function to rewrite links in markdown content
function rewriteLinks(content: string): string {
  return (
    content
      // Rewrite absolute docs links: /docs/something -> /llms.mdx/docs/something
      .replace(/\[([^\]]+)\]\(\/docs\/([^)]+)\)/g, "[$1](/llms.mdx/docs/$2)")
      // Rewrite relative docs links: docs/something -> /llms.mdx/docs/something
      .replace(/\[([^\]]+)\]\(docs\/([^)]+)\)/g, "[$1](/llms.mdx/docs/$2)")
      // Handle links without text: /docs/something -> /llms.mdx/docs/something
      .replace(/\(\/docs\/([^)]+)\)/g, "(/llms.mdx/docs/$1)")
      .replace(/\(docs\/([^)]+)\)/g, "(/llms.mdx/docs/$1)")
  );
}

export async function getLLMText(page: LLMData) {
  const processed = await processor.process({
    path: page.data._file.absolutePath,
    value: page.data.content,
  });

  // Rewrite links in the processed content
  const contentWithRewrittenLinks = rewriteLinks(processed.value.toString());

  return `# ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/TypeCellOS/BlockNote/refs/heads/main/docs/content/docs/${page.file.path}

${page.data.description}
        
${contentWithRewrittenLinks}`;
}
