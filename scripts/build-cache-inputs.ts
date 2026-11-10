/** Keep library build fingerprints portable across fresh CI checkouts. */
export function buildCacheInputs(packagePath: string) {
  return [
    { auto: true as const },
    // Vite Task #504 ignores negative globs for directory-listing children.
    // Exclude only the package-root listing, not source files/subfolders.
    // Explicit root-file globs still detect added or removed build configs.
    { pattern: `!${packagePath}`, base: "workspace" as const },
    "*.{json,ts,mts,cts,js,mjs,cjs}",
    "!dist/**",
    "!types/**",
    // pnpm install metadata includes machine-specific paths/timestamps.
    // Keep dependency invalidation through the portable graph and automatic
    // tracking of the dependency files actually read by the build.
    { pattern: "!node_modules/.modules.yaml", base: "workspace" as const },
    { pattern: "pnpm-lock.yaml", base: "workspace" as const },
    { pattern: "pnpm-workspace.yaml", base: "workspace" as const },
  ];
}
