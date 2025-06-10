import * as glob from "glob";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * We should only have one snapshot file per test, this test ensures that
 *
 * If this test fails, you probably changed something in the request to an LLM.
 * This causes MSW to generate a new snapshot (with a different hash).
 * If that's intended, make sure to delete the old snapshot files.
 */
describe("MSW Snapshots", () => {
  it("should only have one snapshot file per test", async () => {
    const snapshotFiles = glob.sync(
      path.join(__dirname, "../**/__msw_snapshots__/**/*.json"),
    );

    // Group files by test name (excluding the sequence number and hash)
    const testGroups: Record<string, string[]> = {};

    for (const file of snapshotFiles) {
      // Extract the base name (removing the _1_, _2_ etc. and hash)
      const match = file.match(/(.*)_\d+_[a-f0-9]+\.json$/);
      if (match) {
        const baseName = match[1];
        if (!testGroups[baseName]) {
          testGroups[baseName] = [];
        }
        testGroups[baseName].push(file);
      } else {
        throw new Error(`Invalid snapshot file: ${file}`);
      }
    }

    // Filter and get tests with multiple snapshot files
    const duplicates = Object.entries(testGroups)
      .filter(([_, files]) => files.length > 1)
      .map(([testName, files]) => ({
        testName: path.basename(testName),
        count: files.length,
        files: files.map((file) => path.basename(file)),
      }));

    // Create error message if duplicates are found
    const errorMessage =
      duplicates.length > 0
        ? [
            `Found duplicate MSW snapshot files for the following (${duplicates.length}) tests:`,
            ...duplicates.map(
              ({ testName, count, files }) =>
                `  - ${testName}: ${count} files\n    ${files.join("\n    ")}`,
            ),
            "",
            "Each test should have only one snapshot file.",
            "Please clean up the duplicate snapshots by keeping only the most relevant one for each test.",
          ].join("\n")
        : "";

    // Throw an error with the message if duplicates found
    if (duplicates.length > 0) {
      throw new Error(errorMessage);
    }
  });
});

describe("Test environment", () => {
  it("should have certs installed to connect to localhost", () => {
    expect(process.env.NODE_EXTRA_CA_CERTS).toBeDefined();

    /* if this test fails, maybe you're running tests via vscode extension?

    You'll need:

    "vitest.nodeEnv": {
      "NODE_EXTRA_CA_CERTS": "/Users/USERNAME/Library/Application Support/mkcert/rootCA.pem"
    }

    in your vscode settings (or other path to mkcert rootCA.pem)
    */
  });
});
