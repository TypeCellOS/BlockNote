import { Block, UnreachableCaseError } from "@blocknote/core";
import { useBlockNoteEditor } from "@blocknote/react";
import { LanguageModel } from "ai";
import { createContext, useCallback, useContext, useState } from "react";
import { PromptOrMessages, llm } from "../api/index.js";

// parameters that are shared across all calls and can be configured on the context as "application wide" settings
type GlobalLLMCallOptions = {
  model: LanguageModel;
  dataFormat?: "html" | "json" | "markdown";
  stream?: boolean;
};

// parameters that are specific to each call
type CallSpecificCallLLMOptions = Omit<
  Parameters<typeof llm.json.call>[1] & Parameters<typeof llm.markdown.call>[1],
  "model" | "stream" | "prompt" | "messages"
> &
  PromptOrMessages;

export type BlockNoteAIContextValue = {
  callLLM: (options: CallSpecificCallLLMOptions) => Promise<any>; // TODO: figure out return value
  aiMenuBlockID: ReturnType<typeof useState<string | undefined>>[0];
  setAiMenuBlockID: ReturnType<typeof useState<string | undefined>>[1];
  aiResponseStatus: "initial" | "generating" | "done";
  setAIResponseStatus: (
    aiResponseStatus: "initial" | "generating" | "done"
  ) => void;
  prevDocument: ReturnType<
    typeof useState<Block<any, any, any>[] | undefined>
  >[0];
  setPrevDocument: ReturnType<
    typeof useState<Block<any, any, any>[] | undefined>
  >[1];
} & GlobalLLMCallOptions;

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

export function BlockNoteAIContextProvider(
  props: {
    children: React.ReactNode;
  } & GlobalLLMCallOptions
) {
  const editor = useBlockNoteEditor();
  const { children, ...globalLLMCallOptions } = props;
  const [aiMenuBlockID, setAiMenuBlockID] = useState<string | undefined>(
    undefined
  );
  const [prevDocument, setPrevDocument] = useState<
    Block<any, any, any>[] | undefined
  >(editor.document);

  const { model, dataFormat, stream } = {
    // defaults
    stream: true,
    dataFormat: "html" as const,
    ...globalLLMCallOptions,
  };

  const [aiResponseStatus, setAIResponseStatus] = useState<
    "initial" | "generating" | "done"
  >("initial");

  // We provide a function that uses the global options to call LLM functions
  const callLLM = useCallback(
    async (options: CallSpecificCallLLMOptions) => {
      setPrevDocument(editor.document);
      setAIResponseStatus("generating");

      try {
        let resultStream: Awaited<
          ReturnType<typeof llm.json.call>
        >["toolCallsStream"];

        if (dataFormat === "json") {
          const ret = await llm.json.call(editor, {
            model,
            stream,
            ...options,
          });
          resultStream = ret.toolCallsStream;
        } else if (dataFormat === "markdown") {
          const ret = await llm.markdown.call(editor, {
            model,
            stream,
            ...options,
          });
          resultStream = ret.toolCallsStream;
        } else if (dataFormat === "html") {
          const ret = await llm.html.call(editor, {
            model,
            stream,
            ...options,
          });
          resultStream = ret.toolCallsStream;
        } else {
          throw new UnreachableCaseError(dataFormat);
        }

        for await (const operation of resultStream) {
          if (operation.result === "ok") {
            // TODO: check should be part of pipeline
            setAiMenuBlockID(operation.lastBlockId);
          }
        }

        setAIResponseStatus((old) => {
          // if the menu has been closed already, it's probably set to "initial" and not "generating" anymore,
          // in that case, don't set it to "done"
          if (old === "generating") {
            return "done";
          }
          return old;
        });
      } catch (e) {
        setAIResponseStatus("initial");
        setPrevDocument(undefined);
        // eslint-disable-next-line no-console
        console.error(e);
      }
    },
    [model, dataFormat, stream, editor]
  );

  // TODO: Revisit - this pattern might be a bit iffy
  // Make editor non-editable after calling the LLM, until the user accepts or
  // reverts the changes.
  // useEffect(() => {
  //   editor.isEditable = aiResponseStatus === "initial";
  // }, [aiResponseStatus, editor]);

  return (
    <BlockNoteAIContext.Provider
      value={{
        ...globalLLMCallOptions,
        callLLM,
        aiMenuBlockID,
        setAiMenuBlockID,
        prevDocument,
        setPrevDocument,
        aiResponseStatus,
        setAIResponseStatus,
      }}>
      {props.children}
    </BlockNoteAIContext.Provider>
  );
}
