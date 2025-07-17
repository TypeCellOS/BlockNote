import type { Project } from "../util";

const template = (project: Project) => ({
  name: "@blocknote/example-" + project.fullSlug.replace("/", "-"),
  description: "AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY",
  private: true,
  version: "0.12.4",
  scripts: {
    start: "vite",
    dev: "vite",
    "build:prod": "tsc && vite build",
    preview: "vite preview",
  },
  dependencies: {
    "@blocknote/core": "latest",
    "@blocknote/react": "latest",
    "@blocknote/ariakit": "latest",
    "@blocknote/mantine": "latest",
    "@blocknote/shadcn": "latest",
    react: "^19.1.0",
    "react-dom": "^19.1.0",
    ...(project.config?.dependencies || {}),
  },
  devDependencies: {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.3.1",
    vite: "^5.3.4",
    ...(project.config?.devDependencies || {}),
  },
});

export default template;
