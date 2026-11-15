import { parseSourceUrl } from "./url.js";

/** Read one unambiguous literal source without inserting content or loading resources. */
export function clipboardUrl(data: DataTransfer): string | undefined {
  const plain = data.getData("text/plain").trim();
  const markdown = data.getData("text/markdown").trim();
  const uri = data
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const html = data.getData("text/html");
  let htmlUrl = "";
  if (html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    // Only transparent text wrappers and a single anchor; never flatten rich payloads.
    if (
      template.content.querySelector(
        ":not(a):not(span):not(p):not(div):not(br)",
      ) ||
      template.content.querySelectorAll("a").length > 1 ||
      template.content.querySelectorAll("p,div").length > 1
    ) {
      return undefined;
    }
    if (
      [...template.content.querySelectorAll("*")].some((element) =>
        [...element.attributes].some(
          (attribute) => attribute.name !== "href" || element.tagName !== "A",
        ),
      )
    ) {
      return undefined;
    }
    const anchor = template.content.querySelector("a");
    const text = template.content.textContent?.trim() ?? "";
    if (anchor && text !== anchor.textContent?.trim()) {
      return undefined;
    }
    htmlUrl = anchor?.getAttribute("href")?.trim() ?? text;
    if (!parseSourceUrl(htmlUrl)) {
      return undefined;
    }
  }
  const url = plain || markdown || uri[0] || htmlUrl;
  if (
    parseSourceUrl(url) &&
    (!markdown || markdown === url) &&
    uri.length <= 1 &&
    (!uri.length || uri[0] === url) &&
    (!htmlUrl || htmlUrl === url)
  ) {
    return url;
  }
  return undefined;
}
