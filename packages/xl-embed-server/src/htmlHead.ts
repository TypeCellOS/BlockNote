import { Parser } from "htmlparser2";

export type HtmlHead = {
  title?: string;
  meta: Record<string, string>[];
  links: Record<string, string>[];
};
type HeadResult =
  | { value: HtmlHead; error?: undefined }
  | { error: "complexity" };

/** One incremental parser for both the read boundary and decoded head data. */
export function createHeadCollector() {
  const head: HtmlHead = { meta: [], links: [] };
  let result: HeadResult = { value: head };
  let depth = 0;
  let stopped = false;
  let title: string | undefined;
  const parser = new Parser({
    onopentag(name, attributes) {
      // Bound stack searches for unmatched end tags as well as parser memory.
      // Void tags receive an immediate closing callback, so they do not accrue.
      if (++depth > 128) {
        result = { error: "complexity" };
        stop();
        return;
      }
      if (name === "body") {
        stop();
      } else if (name === "meta") {
        head.meta.push(attributes);
      } else if (name === "link") {
        head.links.push(attributes);
      } else if (name === "title" && head.title === undefined) {
        title = "";
      }
    },
    ontext(text) {
      if (title !== undefined) {
        title += text;
      }
    },
    onclosetag(name, implied) {
      depth--;
      if (name === "head" && !implied) {
        stop();
      } else if (name === "title" && title !== undefined) {
        if (!implied) {
          head.title = title;
        }
        title = undefined;
      }
    },
  });
  function stop() {
    stopped = true;
    parser.pause();
  }
  // Parser drops unmatched end tags. Seed a head so </head> remains a read
  // boundary even when the page omits its opening <head>. Implied closes (also
  // emitted at EOF) never terminate reads; opening <body> does so explicitly.
  parser.write("<head>");
  return {
    push(text: string): boolean {
      if (!stopped) {
        parser.write(text);
      }
      return stopped;
    },
    finish(): HeadResult {
      if (!stopped) {
        parser.end();
      }
      return result;
    },
  };
}
