import { streamTool } from "../../../../streamTool/streamTool.js";

type FileReplaceToolCall = {
  type: "file_replace";
  target: string;
  replacement: string;
};

// Placeholder for now
export const tools = {
  // We use streamTool directly as requested
  replace: streamTool<FileReplaceToolCall>({
    name: "file_replace",
    description: "Replace a part of the document file",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The string to replace",
        },
        replacement: {
          type: "string",
          description: "The replacement string",
        },
      },
      required: ["target", "replacement"],
    },
    validate: (operation: any) => {
      if (!operation.target || !operation.replacement) {
        return { ok: false, error: "Missing target or replacement" };
      }
      return { ok: true, value: operation as FileReplaceToolCall };
    },
    executor: () => {
      return {
        execute: async (chunk) => {
          if (chunk.operation.type !== "file_replace") {
            return false;
          }

          const operation = chunk.operation as FileReplaceToolCall;

          // Placeholder: logic to map to block updates will be added later
          return true;
        },
      };
    },
  }),
};

// TODO: correct approach at all? prosemirror vs html / tsx docs
//
