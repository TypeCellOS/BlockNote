import { ReactFileBlockExtension } from "../reactFileBlockExtension";
import { reactImageFileExtension } from "./reactImageFileExtension";
import { reactVideoFileExtension } from "./reactVideoFileExtension";
import { reactAudioFileExtension } from "./reactAudioFileExtension";

export const defaultReactFileExtensions: Record<
  string,
  ReactFileBlockExtension
> = {
  image: reactImageFileExtension,
  video: reactVideoFileExtension,
  audio: reactAudioFileExtension,
};
