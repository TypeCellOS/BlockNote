import { readFile } from "node:fs/promises";
import { createFixtureRouteMock } from "./fixtureRoutes.js";

// Use the original MDN CC0 samples so the intrinsic video size and player
// layout do not change. Docker mounts tests/public with the other fixtures.
const media = [
  {
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
    fixture: new URL("../../../public/video.webm", import.meta.url),
    contentType: "video/webm",
  },
  {
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
    fixture: new URL("../../../public/t-rex-roar.mp3", import.meta.url),
    contentType: "audio/mpeg",
  },
];

export const mockVersioningMedia = createFixtureRouteMock(() =>
  Promise.all(
    media.map(async ({ url, fixture, contentType }) => {
      const body = await readFile(fixture);
      return {
        url,
        handler: (route) => route.fulfill({ body, contentType }),
      };
    }),
  ),
);
