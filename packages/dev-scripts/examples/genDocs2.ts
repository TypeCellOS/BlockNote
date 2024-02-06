import * as fs from "node:fs";
import * as path from "node:path";
import { Files, Project, getExampleProjects, getProjectFiles } from "./util";

/*
 `genDocs` generates the nextjs example blocks for the website docs. 
 Note that these files are not checked in to the repo, so this command should always be run before running / building the site
 */

const dir = path.parse(import.meta.url.replace("file://", "")).dir;

const templateExample = (
  project: Project,
  files: Files
) => `import { ExampleBlock } from "../../ExampleBlock";
import { Tabs } from "nextra/components";

<ExampleBlock name="${project.slug}">
  <Tabs items={${JSON.stringify(Object.keys(files))}}>
    ${Object.entries(files)
      .map(
        ([filename, file]) =>
          `<Tabs.Tab>
\`\`\`typescript 
${file.code}
\`\`\`
      </Tabs.Tab>`
      )
      .join("")}
  </Tabs>
</ExampleBlock>`;
// TODO: language

const templateExamples = (
  projects: Project[]
) => `import dynamic from "next/dynamic";
  
export const examples = {
${projects
  .map(
    (p) => `  "${p.slug}": {
    App: () => <div>hello</div>,
    // App: dynamic(() => import("../../../../examples/${p.slug}/App"), {
    //   ssr: false,
    // }),
    ExampleWithCode: dynamic(() => import("./mdx/${p.slug}.mdx"), {
      // ssr: false,
    }),
  },`
  )
  .join("\n")}  
};`;

const templatePageForExample = (
  project: Project,
  readme: string
) => `import { Example } from "../../../components/example";

${readme}

<Example name="${project.slug}" />`;

async function generateCodeForExample(project: Project) {
  const target = path.resolve(
    dir,
    "../../../docs/components/example/generated/mdx/" + project.slug + ".mdx"
  );

  const files = getProjectFiles(project);
  const filtered = Object.fromEntries(
    Object.entries(files).filter(([filename, file]) => !file.hidden)
  );

  const code = templateExample(project, filtered);

  fs.writeFileSync(target, code);
}

async function generatePageForExample(project: Project) {
  let groupSlug = project.config.group.toLocaleLowerCase().replace(" ", "-");
  if (groupSlug.endsWith("-examples")) {
    groupSlug = groupSlug.replace("-examples", "");
  }

  if (
    !fs.existsSync(
      path.resolve(dir, "../../../docs/pages/examples/" + groupSlug)
    )
  ) {
    fs.mkdirSync(
      path.resolve(dir, "../../../docs/pages/examples/" + groupSlug)
    );
  }

  const target = path.resolve(
    dir,
    "../../../docs/pages/examples/" + groupSlug + "/" + project.slug + ".mdx"
  );

  const files = getProjectFiles(project);

  const code = templatePageForExample(project, files["/README.md"]!.code);

  fs.writeFileSync(target, code);
}

async function generateExampleList(projects: Project[]) {
  const target = path.resolve(
    dir,
    "../../../docs/components/example/generated/examples.gen.tsx"
  );

  const code = templateExamples(projects);

  fs.writeFileSync(target, code);
}

const projects = getExampleProjects(); // TODO: .filter((p) => p.config?.docs === true);

for (const project of projects) {
  console.log("generating code for example", project);
  await generateCodeForExample(project);
  await generatePageForExample(project);
}

await generateExampleList(projects);
