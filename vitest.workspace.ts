import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./packages/xl-docx-exporter/vite.config.ts",
  "./packages/react/vite.config.ts",
  "./packages/shadcn/vite.config.ts",
  "./packages/server-util/vite.config.ts",
  "./packages/xl-pdf-exporter/vite.config.ts",
  "./packages/xl-email-exporter/vite.config.ts",
  "./packages/xl-ai/vite.config.ts",
  "./packages/mantine/vite.config.ts",
  "./packages/core/vite.config.ts",
  "./packages/xl-multi-column/vite.config.ts",
  "./packages/ariakit/vite.config.ts",
  "./tests/vite.config.ts",
]);
