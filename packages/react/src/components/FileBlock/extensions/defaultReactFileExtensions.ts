import { ReactFileBlockExtension } from "../reactFileBlockExtension";
import { reactImageFileExtension } from "./reactImageFileExtension";

export const defaultReactFileExtensions: Record<
  string,
  ReactFileBlockExtension
> = {
  image: reactImageFileExtension,
};
