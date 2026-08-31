import { resolve } from "node:path";

type NodeCompilerInstance =
  import("@myriaddreamin/typst-ts-node-compiler").NodeCompiler;

// One shared compiler for the common (default-font) case - creating a
// NodeCompiler scans system fonts, which would dominate test time if every
// compile created its own. Its shadow files are reset per call; a call with
// custom `fontBlobs` gets a throwaway compiler instead, since fonts are
// fixed at creation.
let defaultCompiler: NodeCompilerInstance | undefined;

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
  let compiler: NodeCompilerInstance;
  if (options.fontBlobs?.length) {
    compiler = NodeCompiler.create({
      fontArgs: [{ fontBlobs: options.fontBlobs }],
    });
  } else {
    defaultCompiler ??= NodeCompiler.create();
    compiler = defaultCompiler;
    compiler.resetShadow();
  }
  for (const [path, bytes] of options.assets ?? []) {
    compiler.mapShadow(
      resolve(process.cwd(), path.replace(/^\/+/, "")),
      Buffer.from(bytes),
    );
  }
  return compiler.pdf(
    { mainFileContent: typst },
    {
      pdfStandard: options.pdfStandard,
      creationTimestamp: options.creationTimestamp,
    },
  );
}
