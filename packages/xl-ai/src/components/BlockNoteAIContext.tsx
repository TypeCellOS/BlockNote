import { Block } from "@blocknote/core";
import { useBlockNoteEditor } from "@blocknote/react";
import { LanguageModel } from "ai";
import { createContext, useContext, useState } from "react";

export type BlockNoteAIContextValue = {
  model: LanguageModel;
  aiMenuBlockID: ReturnType<typeof useState<string | undefined>>[0];
  setAiMenuBlockID: ReturnType<typeof useState<string | undefined>>[1];
  prevDocument: ReturnType<
    typeof useState<Block<any, any, any>[] | undefined>
  >[0];
  setPrevDocument: ReturnType<
    typeof useState<Block<any, any, any>[] | undefined>
  >[1];
};

export const BlockNoteAIContext = createContext<
  BlockNoteAIContextValue | undefined
>(undefined);

export function useBlockNoteAIContext(): BlockNoteAIContextValue {
  const context = useContext(BlockNoteAIContext);

  if (!context) {
    throw new Error(
      "useBlockNoteAIContext must be used within a BlockNoteAIContextProvider"
    );
  }

  return context;
}

export function BlockNoteAIContextProvider(props: {
  model: LanguageModel;
  children: React.ReactNode;
}) {
  const editor = useBlockNoteEditor();

  const [aiMenuBlockID, setAiMenuBlockID] = useState<string | undefined>(
    undefined
  );
  const [prevDocument, setPrevDocument] = useState<
    Block<any, any, any>[] | undefined
  >(editor.document);

  return (
    <BlockNoteAIContext.Provider
      value={{
        model: props.model,
        aiMenuBlockID,
        setAiMenuBlockID,
        prevDocument,
        setPrevDocument,
      }}>
      {props.children}
    </BlockNoteAIContext.Provider>
  );
}
