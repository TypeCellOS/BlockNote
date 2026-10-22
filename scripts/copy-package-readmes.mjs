import { copyFileSync } from "node:fs";

for (const packageName of ["core", "react"]) {
  copyFileSync("README.md", `packages/${packageName}/README.md`);
}
