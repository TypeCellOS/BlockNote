import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { InvalidOrOk } from "../../../functions/blocknoteFunctions.js";

import { AddFunctionBase } from "../../../functions/add.js";
import { DeleteFunction } from "../../../functions/delete.js";
import { UpdateFunctionBase } from "../../../functions/update.js";
import { validateBlockFunction } from "./validate.js";

export class AddFunctionJSON extends AddFunctionBase<
  PartialBlock<any, any, any>
> {
  protected validateBlock(
    block: any,
    editor: BlockNoteEditor<any, any, any>
  ): InvalidOrOk<PartialBlock<any, any, any>> {
    return validateBlockFunction(block, editor);
  }
}

export class UpdateFunctionJSON extends UpdateFunctionBase<
  PartialBlock<any, any, any>
> {
  protected validateBlock(
    block: any,
    editor: BlockNoteEditor<any, any, any>
  ): InvalidOrOk<PartialBlock<any, any, any>> {
    return validateBlockFunction(block, editor);
  }
}

export type AIFunctionJSON =
  | AddFunctionJSON
  | UpdateFunctionJSON
  | DeleteFunction;
