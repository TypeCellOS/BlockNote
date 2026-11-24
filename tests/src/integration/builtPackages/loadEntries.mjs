// Imports every entry of every published package from its build output, in
// plain Node (no bundler, no Vitest), and prints the entries that fail as JSON.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packagesDir = resolve(import.meta.dirname, "../../../../packages");

const failures = [];
for (const dir of readdirSync(packagesDir)) {
  const packageJSONPath = join(packagesDir, dir, "package.json");
  if (!existsSync(packageJSONPath)) {
    continue;
  }
  const pkg = JSON.parse(readFileSync(packageJSONPath, "utf8"));
  if (pkg.private || !pkg.exports) {
    continue;
  }
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    const file =
      typeof target === "string" ? target : (target.import ?? target.default);
    // Stylesheets and WebAssembly files are for bundlers, not for Node.
    if (!file || !/\.m?js$/.test(file)) {
      continue;
    }
    try {
      await import(pathToFileURL(resolve(packagesDir, dir, file)).href);
    } catch (error) {
      failures.push({
        entry: pkg.name + subpath.slice(1),
        error: String(error).split("\n")[0],
      });
    }
  }
}

console.log(JSON.stringify(failures));
