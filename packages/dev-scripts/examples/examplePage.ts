import type { Project } from "./util.js";

export function examplePage(project: Project) {
  return {
    filename: `${project.fullSlug}.mdx`,
    frontmatter: `---
title: ${project.title}
author: ${JSON.stringify(project.config.author)}
---
`,
    body: `\n${project.readme}\n`,
  };
}
