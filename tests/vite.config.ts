import * as path from "path";
import { defineConfig, type UserConfig } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsgo",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
            ],
          },
          test: {
            command: "vp test --run",
            input: [
              { auto: true },
              { pattern: "!**/.next/**", base: "workspace" },
              {
                pattern: "!tests/nextjs-test-app/node_modules/**",
                base: "workspace",
              },
            ],
          },
        },
      },
      test: {
        environment: "jsdom",
        setupFiles: ["./vitestSetup.ts"],
        include: ["./src/unit/**/*.test.ts", "./src/unit/**/*.test.tsx"],
      },
      resolve: {
        alias:
          conf.command === "build"
            ? ({
                "@shared": path.resolve(__dirname, "../shared/"),
              } as Record<string, string>)
            : ({
                "@shared": path.resolve(__dirname, "../shared/"),
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(
                  __dirname,
                  "../packages/core/src/",
                ),
                "@blocknote/react": path.resolve(
                  __dirname,
                  "../packages/react/src/",
                ),
              } as Record<string, string>),
      },
    }) as UserConfig,
);
