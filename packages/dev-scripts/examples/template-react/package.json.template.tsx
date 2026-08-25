import { getCatalogVersion, type Project } from "../util.js";

// Each example gets exactly one BlockNote UI library, selected via the
// `uiLib` field in its `.bnexample.json` (default: mantine). The Mantine
// variant also carries `@mantine/core`/`@mantine/hooks` because
// `@blocknote/mantine` declares them as peer dependencies, and the generated
// package.json must install standalone (e.g. StackBlitz via `npm install`).
function uiLibDependencies(project: Project): Record<string, string> {
  switch (project.config.uiLib) {
    case "ariakit":
      return { "@blocknote/ariakit": "latest" };
    case "shadcn":
      return { "@blocknote/shadcn": "latest" };
    case "mantine":
    case undefined:
      return {
        "@blocknote/mantine": "latest",
        "@mantine/core": "^9.0.2",
        "@mantine/hooks": "^9.0.2",
      };
  }
}

const template = (project: Project) => ({
  name: "@blocknote/example-" + project.fullSlug.replace("/", "-"),
  description: "AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY",
  type: "module",
  private: true,
  version: "0.0.0",
  scripts: {
    start: "vite",
    dev: "vite",
    "build:prod": "tsc && vite build",
    preview: "vite preview",
  },
  dependencies: {
    "@blocknote/core": "latest",
    "@blocknote/react": "latest",
    ...uiLibDependencies(project),
    react: "^19.2.3",
    "react-dom": "^19.2.3",
    ...(project.config.tailwind
      ? {
          tailwindcss: "^4.1.14",
          "tw-animate-css": "^1.4.0",
        }
      : {}),
    ...(project.config?.dependencies || {}),
  },
  devDependencies: {
    ...(project.config.tailwind
      ? {
          "@tailwindcss/vite": "^4.1.14",
        }
      : {}),
    "@types/react": "^19.2.3",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    vite: getCatalogVersion("vite"),
    ...(project.config?.devDependencies || {}),
  },
});

export default template;
