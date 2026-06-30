import type { CodeBlockPreview } from "@blocknote/core";
import { getMathSource } from "../getMathSource.js";
import { renderKatex } from "./renderKatex.js";

export const createMathPreview: CodeBlockPreview = (block) =>
  renderKatex(getMathSource(block), true);
