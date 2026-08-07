import mermaid from "mermaid";

// The diagrams are rendered manually whenever a block's source changes.
let initialized = false;

export const initializeMermaid = () => {
  if (!initialized) {
    initialized = true;
    mermaid.initialize({
      startOnLoad: false,
      // On render errors, makes Mermaid throw right away - instead of
      // rendering its own error graphic AND leaving its temporary render
      // element behind in the document (it only cleans the element up with
      // this option set). The block renders its own error UI.
      suppressErrorRendering: true,
    });
  }
};
