import { createContext, useContext, useState } from "react";

export type BlockNoteAIContextValue = {
  aiMenuBlockID: ReturnType<typeof useState<string | undefined>>[0];
  setAiMenuBlockID: ReturnType<typeof useState<string | undefined>>[1];
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
  children: React.ReactNode;
}) {
  const [aiMenuBlockID, setAiMenuBlockID] = useState<string | undefined>(
    undefined
  );

  return (
    <BlockNoteAIContext.Provider
      value={{
        aiMenuBlockID,
        setAiMenuBlockID,
      }}>
      {props.children}
    </BlockNoteAIContext.Provider>
  );
}
