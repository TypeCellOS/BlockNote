import type { Project } from "../util";

const template = (_project: Project) => ({
  __comment: "AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY",
  compilerOptions: {
    target: "ESNext",
    useDefineForClassFields: true,
    lib: ["DOM", "DOM.Iterable", "ESNext"],
    allowJs: false,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: "ESNext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx",
    composite: true,
    // The repo-wide alias for the shared test-utils directory (private, so it
    // only resolves inside the monorepo). Harmless for examples that don't use it.
    paths: { "@shared/*": ["../../../shared/*"] },
  },
  include: ["."],
  __ADD_FOR_LOCAL_DEV_references: [
    {
      path: "../../../packages/core/",
    },
    {
      path: "../../../packages/react/",
    },
  ],
});

export default template;
