import { FileBlockExtension } from "../fileBlockExtension";
import { imageFileExtension } from "./imageFileExtension";

export const defaultFileExtensions: Record<string, FileBlockExtension> = {
  image: imageFileExtension,
};
