import type { FC } from "react";
import type {
  CoreMarkViewSpec,
  CoreMarkViewUserOptions,
} from "./CoreMarkViewOptions.js";

// export type ReactMarkViewComponent = ComponentType<Record<string, never>>;

export type ReactMarkViewComponent =
  | FC<{ contentRef: (el: HTMLElement | null) => void }>
  | FC<{ contentRef: (el: HTMLElement | null) => void; value: string }>;

export type ReactMarkViewSpec = CoreMarkViewSpec<ReactMarkViewComponent>;

export type ReactMarkViewUserOptions =
  CoreMarkViewUserOptions<ReactMarkViewComponent>;
