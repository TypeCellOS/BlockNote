import { Result } from "../../../../streamTool/streamTool.js";

export function validateBlockFunction(block: any): Result<string> {
  if (typeof block !== "string") {
    return {
      ok: false,
      error: "block must be a string",
    };
  }

  return {
    ok: true,
    value: block,
  };
}
