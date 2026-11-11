import { getDocument } from "@blocknote/server-util/dom";

// The document agent runs its tools on this server. The markdown
// conversions of BlockNote need a DOM. Install one DOM before BlockNote is
// used, and keep it for all requests.
const document = getDocument();
Object.assign(globalThis, { window: document.defaultView, document });
