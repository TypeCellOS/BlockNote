import { BlockNoteEditor } from "@blocknote/core";
import { InvalidOrOk } from "./blocknoteFunctions.js";

export abstract class LLMFunction<T> {
  public abstract schema: any;
  abstract validate(
    operation: any,
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
    }
  ): InvalidOrOk<T>;
}
