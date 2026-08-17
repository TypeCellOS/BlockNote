import { describe, test } from "vite-plus/test";

import { screenshotFull } from "../../utils/screenshotFull.js";

// Guards the capture utility itself, on synthetic content: screenshotFull
// depends on harness DOM internals (see its doc comment), and a harness
// update that breaks them would otherwise only surface as confusing
// failures in the feature tests using it. Numbered stripes make the failure
// modes obvious in the diff: a plain capture blanks out below ~712px, a
// viewport-only capture comes out downscaled to ~0.14x - the baseline
// proves the full 600x2000 render.
describe("screenshotFull", () => {
  test(
    "captures a tall element completely at full resolution",
    { timeout: 30000 },
    async () => {
      const frame = document.createElement("div");
      frame.style.width = "600px";
      frame.style.background = "white";
      for (let i = 0; i < 40; i++) {
        const stripe = document.createElement("div");
        stripe.textContent = `stripe ${i} - starts at y = ${i * 50}px`;
        stripe.style.height = "50px";
        stripe.style.font = "20px sans-serif";
        stripe.style.background = i % 2 ? "#e3f2fd" : "#fff3e0";
        frame.append(stripe);
      }
      document.body.append(frame);
      try {
        await screenshotFull(frame, "screenshot-full-tall-element");
      } finally {
        frame.remove();
      }
    },
  );
});
