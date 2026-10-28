/** A visually hidden owner whose items remain in their original DOM. */
export function createListOwner(doc: Document, ids: string[]) {
  const owner = doc.createElement("div");
  owner.setAttribute("data-bn-list-owner", "");
  owner.setAttribute("role", "list");
  owner.setAttribute("aria-owns", ids.join(" "));
  // Keep it in the accessibility tree without affecting layout.
  owner.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
  return owner;
}
