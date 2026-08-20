import { resolve } from "node:path";

/**
 * Compiles Typst source with the node compiler for tests, mapping an
 * exporter's collected `assetFiles` into the compiler first.
 *
 * The node compiler resolves a project-absolute Typst path (`/assets/..`)
 * against the cwd, so each shadow file is keyed by that resolved absolute
 * path (the browser pipeline in `compileBrowser.ts` uses the virtual path
 * directly).
 *
 * Pass `pdfStandard: "ua-1"` to run Typst's own PDF/UA-1 validation - it
 * errors on accessibility violations (e.g. images or equations without alt
 * text), making the compile itself a conformance gate.
 */
export async function compileTypstForTesting(
  typst: string,
  options: {
    assets?: ReadonlyMap<string, Uint8Array>;
    pdfStandard?: string;
    creationTimestamp?: number;
    fontBlobs?: Buffer[];
  } = {},
): Promise<Buffer> {
  const { NodeCompiler } =
    await import("@myriaddreamin/typst-ts-node-compiler");
  const compiler = options.fontBlobs?.length
    ? NodeCompiler.create({ fontArgs: [{ fontBlobs: options.fontBlobs }] })
    : NodeCompiler.create();
  for (const [path, bytes] of options.assets ?? []) {
    compiler.mapShadow(
      resolve(process.cwd(), path.replace(/^\/+/, "")),
      Buffer.from(bytes),
    );
  }
  return compiler.pdf(
    { mainFileContent: typst },
    {
      ...(options.pdfStandard ? { pdfStandard: options.pdfStandard } : {}),
      ...(options.creationTimestamp !== undefined
        ? { creationTimestamp: options.creationTimestamp }
        : {}),
    },
  );
}
