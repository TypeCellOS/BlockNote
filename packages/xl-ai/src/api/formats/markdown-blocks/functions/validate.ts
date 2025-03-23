import { InvalidOrOk } from "../../../functions/blocknoteFunctions.js";

export function validateBlockFunction(block: any): InvalidOrOk<string> {
  if (typeof block !== "string") {
    return {
      result: "invalid",
      reason: "block must be a string",
    };
  }

  return {
    result: "ok",
    value: block,
  };
}
