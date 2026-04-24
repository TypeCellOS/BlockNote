#!/usr/bin/env node
/**
 * Regenerate src/extensions/tiptap-extensions/Link/helpers/tlds.ts from IANA's
 * authoritative TLD list.
 *
 * Run with: pnpm --filter @blocknote/core update-tlds
 *
 * Encoding format ported from linkifyjs (MIT, https://github.com/nfrasser/linkifyjs):
 * a sorted TLD list is built into a trie, then serialized as an ASCII string
 * where letters descend the trie and digit runs mean "emit a word and pop N
 * levels back up." Shared TLD prefixes (e.g. construction/consulting/
 * contractors) collapse, producing a payload smaller than a flat list.
 *
 * IDN punycode entries (XN--...) are skipped: the schemeless URL regex in
 * linkDetector.ts requires ASCII-only TLDs, so unicode TLDs would never reach
 * the validation step.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const TLDS_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(
  __dirname,
  "../src/extensions/tiptap-extensions/Link/helpers/tlds.ts",
);

function createTrie(words) {
  const root = {};
  for (const word of words) {
    let current = root;
    for (const letter of word) {
      if (!(letter in current)) {
        current[letter] = {};
      }
      current = current[letter];
    }
    current.isWord = true;
  }
  return root;
}

function encodeTrieHelper(trie) {
  const output = [];
  for (const k in trie) {
    if (k === "isWord") {
      output.push(0);
      continue;
    }
    output.push(k);
    output.push(...encodeTrieHelper(trie[k]));
    if (typeof output[output.length - 1] === "number") {
      output[output.length - 1] += 1;
    } else {
      output.push(1);
    }
  }
  return output;
}

function encodeTlds(tlds) {
  return encodeTrieHelper(createTrie(tlds)).join("");
}

function decodeTlds(encoded) {
  const words = [];
  const stack = [];
  let i = 0;
  const digits = "0123456789";
  while (i < encoded.length) {
    let popDigitCount = 0;
    while (digits.indexOf(encoded[i + popDigitCount]) >= 0) {
      popDigitCount++;
    }
    if (popDigitCount > 0) {
      words.push(stack.join(""));
      let popCount = parseInt(encoded.substring(i, i + popDigitCount), 10);
      while (popCount-- > 0) {
        stack.pop();
      }
      i += popDigitCount;
    } else {
      stack.push(encoded[i]);
      i++;
    }
  }
  return words;
}

async function main() {
  console.log(`Fetching ${TLDS_URL}...`);
  const response = await fetch(TLDS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch IANA TLDs: ${response.status}`);
  }
  const body = await response.text();

  const tlds = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !/^XN--/i.test(line))
    .map((line) => line.toLowerCase())
    .sort();

  console.log(`Encoding ${tlds.length} TLDs...`);
  const encoded = encodeTlds(tlds);

  console.log("Round-trip asserting...");
  const decoded = decodeTlds(encoded);
  if (JSON.stringify(decoded) !== JSON.stringify(tlds)) {
    throw new Error("Encode/decode round-trip mismatch");
  }

  const fileContents = `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.
// Source: ${TLDS_URL}
// Regenerate with: pnpm --filter @blocknote/core update-tlds
// Encoding format ported from linkifyjs (MIT) — trie collapsed into ASCII.

export const ENCODED_TLDS =
  "${encoded}";
`;

  writeFileSync(OUT_PATH, fileContents);
  console.log(
    `Wrote ${OUT_PATH} (${encoded.length} chars, ${tlds.length} TLDs)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
