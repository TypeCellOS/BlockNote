import * as glob from "glob";
import * as fs from "node:fs";
import * as path from "node:path";
import React from "react";
import ReactDOM from "react-dom/server";

type Project = {
  name: string;
  dir: string;
};

async function writeTemplate(project, templateFile: string) {
  const template = await import(templateFile);
  const ret = await template.default();

  let stringOutput: string | undefined = undefined;
  if (React.isValidElement(ret)) {
    stringOutput = ReactDOM.renderToString(ret);
  } else if (typeof ret === "string") {
    stringOutput = ret;
  } else if (typeof ret === "object") {
    stringOutput = JSON.stringify(ret, undefined, 2);
  } else {
    throw new Error("unsupported template");
  }

  const targetFilePath = path.join(
    project.dir,
    path.basename(templateFile).replace(".template.tsx", "")
  );
  // fs.writeFileSync(targetFilePath, stringOutput);
  try {
    fs.unlinkSync(targetFilePath);
  } catch (e) {}
  console.log("written", targetFilePath);
}

async function generateCodeForExample(project: Project) {
  const templates = glob.sync(
    path.resolve(dir, "./template-react/*.template.tsx")
  );

  for (const template of templates) {
    await writeTemplate(project, template);
  }
}

const dir = path.parse(import.meta.url.replace("file://", "")).dir;
const examples = glob.sync(path.resolve(dir, "../../../examples/*/"));

for (const example of examples) {
  console.log("generating code for example", example);
  await generateCodeForExample({
    name: path.basename(example),
    dir: example,
  });
}

console.log(examples);
