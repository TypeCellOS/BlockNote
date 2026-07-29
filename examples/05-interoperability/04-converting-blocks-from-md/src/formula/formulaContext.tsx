import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type FormulaTarget =
  | { kind: "inline"; latex: string }
  | { kind: "block"; latex: string; blockId: string };

export type FormulaEditorApi = {
  openInsert(initialKind: "inline" | "block"): void;
  openEdit(target: FormulaTarget): void;
  close(): void;
};

export type FormulaEditorState = {
  open: boolean;
  mode: "insert" | "edit";
  initialLatex: string;
  initialKind: "inline" | "block";
  editTarget: FormulaTarget | null;
};

const ApiContext = createContext<FormulaEditorApi | null>(null);
const StateContext = createContext<FormulaEditorState | null>(null);

const CLOSED: FormulaEditorState = {
  open: false,
  mode: "insert",
  initialLatex: "",
  initialKind: "inline",
  editTarget: null,
};

export function FormulaEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FormulaEditorState>(CLOSED);

  const api = useMemo<FormulaEditorApi>(
    () => ({
      openInsert(initialKind) {
        setState({
          open: true,
          mode: "insert",
          initialLatex: "",
          initialKind,
          editTarget: null,
        });
      },
      openEdit(target) {
        setState({
          open: true,
          mode: "edit",
          initialLatex: target.latex,
          initialKind: target.kind,
          editTarget: target,
        });
      },
      close() {
        setState(CLOSED);
      },
    }),
    [],
  );

  return (
    <ApiContext.Provider value={api}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ApiContext.Provider>
  );
}

export function useFormulaEditor(): FormulaEditorApi {
  const value = useContext(ApiContext);
  if (!value) {
    throw new Error(
      "useFormulaEditor must be used inside FormulaEditorProvider",
    );
  }
  return value;
}

export function useFormulaEditorState(): FormulaEditorState {
  const value = useContext(StateContext);
  if (!value) {
    throw new Error(
      "useFormulaEditorState must be used inside FormulaEditorProvider",
    );
  }
  return value;
}
