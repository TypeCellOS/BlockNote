import glob from "fast-glob";
import * as fs from "node:fs";
import * as path from "node:path";

const dir = path.parse(import.meta.url.replace("file://", "")).dir;

export type Project = {
  title: string;
  slug: string;
  pathFromRoot: string;
  config: {
    playground: boolean;
    docs: boolean;
    group: string;
    order: number;
    dependencies: any;
    devDependencies: any;
  };
};

export function groupBy<T>(arr: T[], key: (el: T) => string) {
  const groups: Record<string, T[]> = {};
  arr.forEach((val) => {
    const k = key(val);
    if (!groups[k]) {
      groups[k] = [];
    }
    groups[k].push(val);
  });
  return groups;
}

export function groupProjects(projects: Project[]) {
  const grouped = groupBy(projects, (p) => p.config?.group || "other");

  return grouped;
}

export type Files = Record<
  string,
  {
    filename: string;
    code: string;
    hidden: boolean;
  }
>;

export function getProjectFiles(project: Project): Files {
  const dir = path.resolve("../../", project.pathFromRoot);
  const files = glob.globSync(dir + "/**/*", {
    ignore: ["**/node_modules/**/*", "**/dist/**/*"],
  });
  const passedFiles = Object.fromEntries(
    files.map((fullPath) => {
      const filename = fullPath.substring(dir.length);
      return [
        filename,
        {
          filename,
          code: fs.readFileSync(fullPath, "utf-8"),
          hidden:
            !(filename.endsWith(".tsx") || filename.endsWith(".css")) ||
            filename.endsWith("main.tsx"),
        },
      ];
    })
  );
  return passedFiles;
}

/**
 * Get the list of example Projects based on the /examples folder
 */
export function getExampleProjects(): Project[] {
  const examples = glob
    .globSync(path.join(dir, "../../../examples/*/"), { onlyDirectories: true })
    .map((val) => {
      let config: any = undefined;
      const configPath = path.join(val, ".bnexample.json");
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }

      let title: any = path.basename(val);

      const readmePath = path.join(val, "README.md");
      if (fs.existsSync(readmePath)) {
        const md = fs.readFileSync(readmePath, "utf-8");
        title = md.match(/# (.*)/)?.[1] || title;
      }

      // console.log(path.resolve("../../"), val);
      const project = {
        slug: path.basename(val),
        pathFromRoot: path.relative(path.resolve("../../"), val),
        config,
        title,
      };
      return project;
    });

  examples.sort((a, b) => {
    if (a.config?.order && b.config?.order) {
      return a.config.order - b.config.order;
    }
    if (a.config?.order) {
      return -1;
    }
    if (b.config?.order) {
      return 1;
    }
    return 0;
  });
  return examples;
}
