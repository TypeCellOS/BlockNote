import type { ReactNode } from "react";

import { TestContext, testSchema } from "./testSchema.js";

export const testEditorOptions = {
  schema: testSchema,
  skin: "raw",
  trailingBlock: false,
  props: {
    formattingToolbar: false,
    linkToolbar: false,
    slashMenu: false,
    sideMenu: false,
    filePanel: false,
    tableHandles: false,
    emojiPicker: false,
  },
  outside: ({ children }: { children: ReactNode }) => (
    <TestContext.Provider value={true}>{children}</TestContext.Provider>
  ),
} as const;
