import { BlockNoteEditor } from "@blocknote/core";
import { InvalidOrOk } from "../../../functions/blocknoteFunctions.js";

import { AddFunctionBase } from "../../../functions/add.js";
import { DeleteFunction } from "../../../functions/delete.js";
import { UpdateFunctionBase } from "../../../functions/update.js";
import { validateBlockFunction } from "./validate.js";

export class AddFunctionMD extends AddFunctionBase<string> {
  protected validateBlock(
    block: any,
    _editor: BlockNoteEditor<any, any, any>,
    _fallbackType?: string
  ): InvalidOrOk<string> {
    return validateBlockFunction(block);
  }
}

export class UpdateFunctionMD extends UpdateFunctionBase<string> {
  protected validateBlock(
    block: any,
    _editor: BlockNoteEditor<any, any, any>,
    _fallbackType?: string
  ): InvalidOrOk<string> {
    return validateBlockFunction(block);
  }
}

export type AIFunctionMD = AddFunctionMD | UpdateFunctionMD | DeleteFunction;
