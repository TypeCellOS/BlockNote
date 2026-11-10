/**
 * Stage 5 (Fit): the fit of the result to the schema: the layout blocks
 * and the tables.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { fitResult } from "./fitResult.js";
export { fitTables, type FitWarning, mergedCellsRemoved } from "./fitTable.js";
