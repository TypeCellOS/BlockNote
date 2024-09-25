import { addFunction } from "./add";
import { deleteFunction } from "./delete";
import { updateFunction } from "./update";

export type AIFunction =
  | typeof addFunction
  | typeof deleteFunction
  | typeof updateFunction;
