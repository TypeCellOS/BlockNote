import type { Project } from "../util";

const template = (project: Project) => ({
  name: "@blocknote/example-" + project.fullSlug.replace("/", "-"),
  description: "AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY",
  type: "module",
  private: true,
  version: "0.12.4",
  scripts: {
    start: "vite",
    dev: "vite",
    "build:prod": "tsc && vite build",
    preview: "vite preview",
  },
  dependencies: {
    "@blocknote/ariakit": "latest",
    "@blocknote/core": "latest",
    "@blocknote/mantine": "latest",
    "@blocknote/react": "latest",
    "@blocknote/shadcn": "latest",
    "@mantine/core": "^8.3.4",
    "@mantine/hooks": "^8.3.4",
    "@mantine/utils": "^6.0.22",
    zod: "^4.0.0",
    react: "^19.2.0",
    "react-dom": "^19.2.0",
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
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.1",
    "@vitejs/plugin-react": "^4.7.0",
    vite: "^5.4.20",
    ...(project.config?.devDependencies || {}),
  },
});

export default template;
