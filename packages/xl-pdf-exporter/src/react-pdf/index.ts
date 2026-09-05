// The deprecated react-pdf based exporter, kept during its deprecation
// window. Only exposed via the `@blocknote/xl-pdf-exporter/react-pdf`
// subpath so its dependency tree stays out of the root module graph.
export * from "./defaultSchema/index.js";
export * from "./pdfExporter.jsx";
export { Font } from "@react-pdf/renderer";
