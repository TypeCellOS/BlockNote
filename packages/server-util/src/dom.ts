import { JSDOM } from "jsdom";

/** Creates a JSDOM document without installing globals. Share it across editors. */
export function getDocument(): Document {
  return new JSDOM().window.document;
}
