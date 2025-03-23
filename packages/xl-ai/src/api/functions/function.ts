import { BlockNoteEditor } from "@blocknote/core";
import { DeepPartial } from "ai";
import { InvalidOrOk } from "./blocknoteFunctions.js";
export abstract class LLMFunction<T> {
  public abstract schema: any;

  abstract validate(
    operation: DeepPartial<T>,
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
    }
  ): InvalidOrOk<T>;
}
