import glob from "fast-glob";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.parse(fileURLToPath(import.meta.url)).dir;

export type Project = {
  /**
   * The title of the example, from README.md
   */
  title: string;
  /**
   * e.g.: examples/01-basic/01-minimal
   */
  pathFromRoot: string;
  /**
   * e.g.: minimal
   */
  projectSlug: string;
  /**
   * e.g.: basic/minimal
   */
  fullSlug: string;
  group: {
    /**
     * e.g.: examples/01-basic
     */
    pathFromRoot: string;
    /**
     * e.g.: basic
     */
    slug: string;
  };
  /**
   * contents from .bnexample.json
   */
  config: {
    playground: boolean;
    docs: boolean;
    dependencies?: any;
    devDependencies?: any;
    shortTitle?: string;
    author: string;
    pro?: boolean;
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
  const grouped = groupBy(projects, (p) => p.group.slug);

  return Object.fromEntries(
    Object.entries(grouped).map(([key, projects]) => {
      const group = projects[0].group;
      return [
        key,
        {
          ...group,
          projects,
        },
      ];
    })
  );
}

export function addTitleToGroups(grouped: ReturnType<typeof groupProjects>) {
  // read group titles from /pages/examples/_meta.json
  const meta = JSON.parse(
    fs.readFileSync(
      path.resolve(dir, "../../../docs/pages/examples/_meta.json"),
      "utf-8"
    )
  );

  const groupsWithTitles = Object.fromEntries(
    Object.entries(grouped).map(([key, group]) => {
      const title = meta[key];
      if (!title) {
        throw new Error(
          `Missing group title for ${key}, add to examples/_meta.json?`
        );
      }
      return [
        key,
        {
          ...group,
          title,
        },
      ];
    })
  );
  return groupsWithTitles;
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
  const files = glob.globSync(replacePathSepToSlash(dir + "/**/*"), {
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
  const examples: Project[] = glob
    .globSync(
      replacePathSepToSlash(
        path.join(dir, "../../../examples/**/*/.bnexample.json")
      )
    )
    .map((configPath) => {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const directory = path.dirname(configPath);

      const readmePath = path.join(directory, "README.md");
      if (!fs.existsSync(readmePath)) {
        throw new Error(`Missing README.md for ${directory}`);
      }

      const md = fs.readFileSync(readmePath, "utf-8");
      const title = md.match(/# (.*)/)?.[1];

      if (!title?.length) {
        throw new Error(`Missing title in README.md for ${directory}`);
      }

      const [groupDir, exampleDir] = path
        .relative(path.resolve("../../examples"), directory)
        .split(path.sep);

      const group = {
        pathFromRoot: replacePathSepToSlash(
          path.relative(path.resolve("../../"), path.join(directory, ".."))
        ),
        // remove optional 01- prefix
        slug: groupDir.replace(/^\d{2}-/, ""),
      };
      const projectSlug = exampleDir.replace(/^\d{2}-/, "");

      const project = {
        projectSlug,
        fullSlug: `${group.slug}/${projectSlug}`,
        pathFromRoot: replacePathSepToSlash(
          path.relative(path.resolve("../../"), directory)
        ),
        config,
        title,
        group,
      };
      return project;
    });

  // examples.sort((a, b) => {
  //   if (a.config?.order && b.config?.order) {
  //     return a.config.order - b.config.order;
  //   }
  //   if (a.config?.order) {
  //     return -1;
  //   }
  //   if (b.config?.order) {
  //     return 1;
  //   }
  //   return 0;
  // });
  return examples;
}

export function replacePathSepToSlash(path: string) {
  const isExtendedLengthPath = path.startsWith("\\\\?\\");

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replace(/\\/g, "/");
}
