import { getDocument } from "@blocknote/server-util/dom";

// The markdown and HTML conversions of BlockNote need a DOM. On a server,
// install one DOM before BlockNote is used, and keep it for all requests.
const document = getDocument();
Object.assign(globalThis, { window: document.defaultView, document });
