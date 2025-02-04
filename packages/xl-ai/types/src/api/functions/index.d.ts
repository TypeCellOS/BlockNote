import { addFunction } from "./add.js";
import { deleteFunction } from "./delete.js";
import { updateFunction } from "./update.js";
export type AIFunction = typeof addFunction | typeof deleteFunction | typeof updateFunction;
