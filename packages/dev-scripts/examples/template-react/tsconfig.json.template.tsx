import type { Project } from "../gen";

const template = (project: Project) => ({
  __comment: "AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY",
  compilerOptions: {
    target: "ESNext",
    useDefineForClassFields: true,
    lib: ["DOM", "DOM.Iterable", "ESNext"],
    allowJs: false,
    skipLibCheck: true,
    esModuleInterop: false,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: "ESNext",
    moduleResolution: "Node",
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx",
    composite: true,
  },
  include: ["."],
  references: [
    {
      path: "../../packages/core/",
    },
    {
      path: "../../packages/react/",
    },
  ],
});

export default template;
