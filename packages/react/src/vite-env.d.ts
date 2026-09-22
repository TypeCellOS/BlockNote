/// <reference types="vite-plus/client" />

// `process.env.NODE_ENV` is the one Node global the sources read (development-
// only warnings); the library build leaves the expression in place for the
// consumer's bundler, so no Node types are wanted here. Same shape as core's.
declare const process: {
  env: {
    NODE_ENV: string;
  };
};
