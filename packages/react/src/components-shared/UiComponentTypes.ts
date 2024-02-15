import { BlockNoteEditor } from "@blocknote/core";
import { CSSProperties } from "react";

export type UiComponentData<
  UiElementData,
  UiElementPluginName extends keyof BlockNoteEditor<any, any, any>
> = UiElementData &
  Omit<
    BlockNoteEditor<any, any, any>[UiElementPluginName],
    "plugin" | "on" | "onPositionUpdate" | "onDataUpdate" | "off"
  >;

export type UiComponentPosition = {
  isMounted: boolean;
  ref: (node: HTMLElement | null) => void;
  style: CSSProperties;
};
