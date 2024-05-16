import { FileBlockExtension } from "../fileBlockExtension";
import { imageFileExtension } from "./imageFileExtension";
import { videoFileExtension } from "./videoFileExtension";
import { audioFileExtension } from "./audioFileExtension";

export const defaultFileExtensions: Record<string, FileBlockExtension> = {
  image: imageFileExtension,
  video: videoFileExtension,
  audio: audioFileExtension,
};
