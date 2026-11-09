// Mirrors ReactServer.test.tsx — see packages/server-util/src/context/react/ReactServer.test.tsx
import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { getDocument } from "@blocknote/server-util/dom";
import { schema } from "../../shared-schema";

// Keep one DOM across requests and development hot reloads.
const document = globalThis.document ?? getDocument();

export async function GET() {
  const results: Record<string, string> = {};

  // Mirrors ReactServer.test.tsx: "works for simple blocks"
  try {
    const editor = ServerBlockNoteEditor.create({ schema }, document);
    const html = await editor.blocksToFullHTML([
      {
        id: "1",
        type: "simpleReactCustomParagraph",
        content: "React Custom Paragraph",
      },
    ] as any);
    if (!html.includes("simple-react-custom-paragraph")) {
      throw new Error(
        `Expected html to contain "simple-react-custom-paragraph", got: ${html}`,
      );
    }
    results["simpleReactBlock"] = `PASS: ${html.substring(0, 200)}`;
  } catch (e: any) {
    results["simpleReactBlock"] = `FAIL: ${e.message}`;
  }

  // blocksToHTMLLossy with default blocks
  try {
    const editor = ServerBlockNoteEditor.create({ schema }, document);
    const html = await editor.blocksToHTMLLossy([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello World", styles: {} }],
      },
    ] as any);
    if (!html.includes("Hello World")) {
      throw new Error(`Expected html to contain "Hello World", got: ${html}`);
    }
    results["blocksToHTMLLossy"] = `PASS: ${html}`;
  } catch (e: any) {
    results["blocksToHTMLLossy"] = `FAIL: ${e.message}`;
  }

  // Yjs roundtrip
  try {
    const editor = ServerBlockNoteEditor.create({ schema }, document);
    const blocks = [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello World", styles: {} }],
      },
    ] as any;
    const ydoc = editor.blocksToYDoc(blocks);
    const roundtripped = editor.yDocToBlocks(ydoc);
    if (roundtripped.length === 0) {
      throw new Error("Expected at least 1 block after roundtrip");
    }
    results["yDocRoundtrip"] = `PASS: ${roundtripped.length} blocks`;
  } catch (e: any) {
    results["yDocRoundtrip"] = `FAIL: ${e.message}`;
  }

  const allPassed = Object.values(results).every((v) => v.startsWith("PASS"));

  // React's server bundle forbids createContext; that coverage remains in
  // ReactServer.test.tsx rather than being reported as a passing scenario here.
  return Response.json(
    { allPassed, results },
    { status: allPassed ? 200 : 500 },
  );
}
