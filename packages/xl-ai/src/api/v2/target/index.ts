/**
 * Stage 3 (Target): the target document of a text change.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export {
  targetFromPairs,
  type TargetInput,
  type TargetWarning,
} from "./targetFromPairs.js";
