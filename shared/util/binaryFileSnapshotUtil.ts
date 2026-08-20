import fs from "fs";
import path from "path";
const NAME_WORKER_STATE = "__vitest_worker__";

// from https://github.com/vitest-dev/vitest/blob/main/packages/vitest/src/runtime/utils.ts#L8
export function getWorkerState(): any {
  // @ts-expect-error untyped global
  const workerState = globalThis[NAME_WORKER_STATE];
  if (!workerState) {
    const errorMsg =
      "Vitest failed to access its internal state." +
      "\n\nOne of the following is possible:" +
      '\n- "vitest" is imported directly without running "vitest" command' +
      '\n- "vitest" is imported inside "globalSetup" (to fix this, use "setupFiles" instead, because "globalSetup" runs in a different context)' +
      "\n- Otherwise, it might be a Vitest bug. Please report it to https://github.com/vitest-dev/vitest/issues\n";
    throw new Error(errorMsg);
  }
  return workerState;
}

function getSnapshotOptions() {
  const option: "new" | "all" | "none" =
    getWorkerState().ctx.config.snapshotOptions.updateSnapshot;
  return option;
}

// async function createMD5FromBuffer(buffer: Buffer) {
//   const hash = crypto.createHash("md5");
//   hash.update(buffer);
//   return hash.digest("hex");
// }

// async function createMD5FromFile(filePath: string) {
//   const hash = crypto.createHash("md5");

//   if (!fs.existsSync(filePath)) {
//     return undefined;
//   }

//   await pipeline(fs.createReadStream(filePath), async function (source) {
//     for await (const chunk of source) {
//       hash.update(chunk);
//     }
//   });

//   return hash.digest("hex");
// }

export async function toMatchBinaryFileSnapshot(
  buffer: Buffer,
  filepath: string,
  options: {
    /**
     * On a mismatch that fails the test, also write the received bytes next
     * to the baseline (as `<name>.actual.<ext>`) so they can be inspected /
     * diffed - useful for image snapshots.
     */
    writeActualOnMismatch?: boolean;
  } = {},
) {
  const fileBuffer = fs.existsSync(filepath)
    ? fs.readFileSync(filepath)
    : undefined;

  const same = fileBuffer && buffer.equals(fileBuffer); // && bufferMD5 === fileMD5;

  const option = getSnapshotOptions();

  if (same) {
    return;
  }

  if (option === "none" || (option === "new" && fileBuffer !== undefined)) {
    if (options.writeActualOnMismatch) {
      // `name.ext` -> `name.actual.ext`; an extension-less path gets a plain
      // `.actual` suffix (the no-match case must never fall through to the
      // baseline path itself).
      const actualPath = /\.[^./]+$/.test(filepath)
        ? filepath.replace(/(\.[^./]+)$/, ".actual$1")
        : `${filepath}.actual`;
      fs.writeFileSync(actualPath, buffer);
    }
    throw new Error(`${filepath} not matching `);
  }

  // create dir if not exists
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  fs.writeFileSync(filepath, buffer);
}
