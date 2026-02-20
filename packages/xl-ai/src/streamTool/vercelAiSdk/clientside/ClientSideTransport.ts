import {
  ChatTransport,
  LanguageModel,
  ToolSet,
  UIMessage,
  UIMessageChunk,
  convertToModelMessages,
  generateText,
  streamText,
} from "ai";
import { injectDocumentStateMessages } from "../util/injectDocumentStateMessages.js";
import { toolDefinitionsToToolSet } from "../util/toolDefinitions.js";

export const PROVIDER_OVERRIDES = {
  "mistral.chat": {
    mode: "auto" as const,
  },
  "google.generative-ai": {
    mode: "auto" as const,
  },
  "groq.chat": {
    providerOptions: {
      groq: {
        structuredOutputs: false,
      },
    },
  },
} as const;

export function getProviderOverrides(model: Exclude<LanguageModel, string>) {
  return (
    PROVIDER_OVERRIDES[model.provider as keyof typeof PROVIDER_OVERRIDES] || {}
  );
}

export class ClientSideTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  constructor(
    public readonly opts: {
      /**
       * The language model to use for the LLM call (AI SDK)
       *
       * (when invoking `callLLM` via the `AIExtension` this will default to the
       * model set in the `AIExtension` options)
       *
       * Note: perhaps we want to remove this
       */
      model: LanguageModel;

      /**
       * The system prompt to use for the LLM call
       *
       * @default undefined
       */
      systemPrompt?: string;

      /**
       * Whether to stream the LLM response or not
       *
       * When streaming, we use the AI SDK stream function `streamText`,
       * otherwise, we use the AI SDK `generateText` function.
       *
       * @default true
       */
      stream?: boolean;

      /**
       * Additional options to pass to the AI SDK `streamText` / `generateText` functions
       */
      _additionalOptions?:
        | Partial<Parameters<typeof generateText>[0]>
        | Partial<Parameters<typeof streamText>[0]>;
    },
  ) {}

  /**
   * Calls an LLM with StreamTools, using the `streamText` of the AI SDK.
   *
   * This is the streaming version.
   */
  protected async streamText(messages: UIMessage[], tools: ToolSet) {
    const { model, _additionalOptions } = this.opts;

    const ret = streamText({
      model,
      system: this.opts.systemPrompt,
      messages: await convertToModelMessages(
        injectDocumentStateMessages(messages),
      ),
      tools,
      // tools: {
      //   str_replace_based_edit_tool: anthropic.tools.textEditor_20250728({
      //     execute: async ({}) => {
      //       return {};
      //     },
      //     needsApproval: true,
      //   }),
      // },

      toolChoice: "required",
      // extra options for streamObject
      ...((_additionalOptions ?? {}) as any),
      // activeTools: ["applyDocumentOperations"],
      onFinish: ({ usage }) => {
        // your own logic, e.g. for saving the chat history or recording usage
        console.log("usage:", JSON.stringify(usage, null, 2));
      },
    });
    // console.log(
    //   JSON.stringify(
    //     await convertToModelMessages(injectDocumentStateMessages(messages)),
    //     null,
    //     2,
    //   ),
    // );
    return ret.toUIMessageStream();
  }

  async sendMessages({
    messages,
    body,
    // metadata,
  }: Parameters<ChatTransport<UI_MESSAGE>["sendMessages"]>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const stream = this.opts.stream ?? true;
    const toolDefinitions = (body as any).toolDefinitions;
    const tools = await toolDefinitionsToToolSet(toolDefinitions);

    if (stream) {
      // this can be used to simulate initial network errors
      // if (Math.random() < 0.5) {
      //   throw new Error("fake network error");
      // }

      const ret = await this.streamText(messages, tools);

      // this can be used to simulate network errors while streaming
      // let i = 0;
      // return ret.pipeThrough(
      //   new TransformStream({
      //     transform(chunk, controller) {
      //       controller.enqueue(chunk);

      //       if (++i === 200) {
      //         console.log("cancel stream");
      //         controller.error(new Error("fake network error"));
      //       }
      //     },
      //   }),
      // );

      return ret;
    } else {
      // https://github.com/vercel/ai/issues/8380
      throw new Error("Not implemented (generateText)");
    }
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    throw new Error("Not implemented");
  }
}
