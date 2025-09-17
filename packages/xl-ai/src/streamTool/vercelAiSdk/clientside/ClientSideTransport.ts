import {
  ChatTransport,
  LanguageModel,
  UIMessage,
  UIMessageChunk,
  convertToModelMessages,
  generateObject,
  generateText,
  jsonSchema,
  streamObject,
  streamText,
  tool,
} from "ai";
import {
  objectAsToolCallInUIMessageStream,
  partialObjectStreamAsToolCallInUIMessageStream,
} from "../util/partialObjectStreamUtil.js";

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
       * Whether to stream the LLM response or not
       *
       * When streaming, we use the AI SDK stream functions `streamObject` / `streamText,
       * otherwise, we use the AI SDK `generateObject` / `generateText` functions.
       *
       * @default true
       */
      stream?: boolean;

      /**
       * Use object generation instead of tool calling
       *
       * @default false
       */
      objectGeneration?: boolean;

      /**
       * Additional options to pass to the AI SDK `generateObject` / `streamObject` / `streamText` / `generateText` functions
       */
      _additionalOptions?:
        | Partial<Parameters<typeof generateObject>[0]>
        | Partial<Parameters<typeof streamObject>[0]>
        | Partial<Parameters<typeof generateText>[0]>
        | Partial<Parameters<typeof streamText>[0]>;
    },
  ) {}

  /**
   * Calls an LLM with StreamTools, using the `generateObject` of the AI SDK.
   *
   * This is the non-streaming version.
   */
  protected async generateObject(
    messages: UIMessage[],
    streamToolJSONSchema: any,
  ) {
    const { model, _additionalOptions } = this.opts;

    if (typeof model === "string") {
      throw new Error("model must be a LanguageModelV2");
    }

    const schema = jsonSchema(streamToolJSONSchema);

    const ret = await generateObject<any, any, { operations: any }>({
      // non-overridable options for streamObject
      output: "object" as const,
      schema,
      model,
      // configurable options for streamObject

      // - optional, with defaults

      // mistral somehow needs "auto", while groq/llama needs "tool"
      // google needs "auto" because https://github.com/vercel/ai/issues/6959
      // TODO: further research this and / or make configurable
      // for now stick to "tool" by default as this has been tested mostly
      mode:
        model.provider === "mistral.chat" ||
        model.provider === "google.generative-ai"
          ? "auto"
          : "tool",
      messages: convertToModelMessages(messages),
      providerOptions:
        model.provider === "groq.chat"
          ? {
              groq: {
                structuredOutputs: false,
              },
            }
          : {},
      // extra options for streamObject
      ...((_additionalOptions ?? {}) as any),
    });

    return objectAsToolCallInUIMessageStream(ret.object, "operations"); // TODO, better not hardcode
  }

  /**
   * Calls an LLM with StreamTools, using the `streamObject` of the AI SDK.
   *
   * This is the streaming version.
   */
  protected async streamObject(
    messages: UIMessage[],
    streamToolJSONSchema: any,
  ) {
    const { model, _additionalOptions } = this.opts;

    if (typeof model === "string") {
      throw new Error("model must be a LanguageModelV2");
    }

    const schema = jsonSchema(streamToolJSONSchema);

    const ret = streamObject({
      // non-overridable options for streamObject
      output: "object" as const,
      schema,
      model,
      // configurable options for streamObject

      // - optional, with defaults
      // mistral somehow needs "auto", while groq/llama needs "tool"
      // google needs "auto" because https://github.com/vercel/ai/issues/6959
      // TODO: further research this and / or make configurable
      // for now stick to "tool" by default as this has been tested mostly
      mode:
        model.provider === "mistral.chat" ||
        model.provider === "google.generative-ai"
          ? "auto"
          : "tool",
      //  - mandatory ones:
      messages: convertToModelMessages(messages),
      providerOptions:
        model.provider === "groq.chat"
          ? {
              groq: {
                structuredOutputs: false,
              },
            }
          : {},
      // extra options for streamObject
      ...((_additionalOptions ?? {}) as any),
    });

    // Transform the partial object stream to a data stream format
    return partialObjectStreamAsToolCallInUIMessageStream(
      ret.fullStream,
      "operations", // TODO, better not hardcode
    );
  }

  /**
   * Calls an LLM with StreamTools, using the `streamText` of the AI SDK.
   *
   * This is the streaming version.
   */
  protected async streamText(messages: UIMessage[], streamToolJSONSchema: any) {
    const { model, _additionalOptions } = this.opts;

    const ret = streamText({
      model,
      messages: convertToModelMessages(messages),
      tools: {
        operations: tool({
          name: "operations",
          inputSchema: jsonSchema(streamToolJSONSchema),
        }),
      },
      // extra options for streamObject
      ...((_additionalOptions ?? {}) as any),
    });

    return ret.toUIMessageStream();
  }

  /**
   * // https://github.com/vercel/ai/issues/8380
   *
   * Calls an LLM with StreamTools, using the `generateText` of the AI SDK.
   *
   * This is the streaming version.
   */
  // protected async generateText<T extends StreamTool<any>[]>(
  //   messages: UIMessage[],
  //   streamTools: T,
  // ) {

  //   throw new Error("Not implemented");
  //   // const { model, _additionalOptions, maxRetries } = this.opts;

  //   // const ret = await generateText({
  //   //   model,
  //   //   messages: convertToModelMessages(messages),
  //   //   maxRetries,
  //   //   tools: {
  //   //     operations: streamToolsAsTool(streamTools),
  //   //   },
  //   //   // extra options for streamObject
  //   //   ...((_additionalOptions ?? {}) as any),
  //   // });

  //   // return createUIMessageStream(ret.response.messages);
  // }

  async sendMessages({
    messages,
    body,
    // metadata,
  }: Parameters<ChatTransport<UI_MESSAGE>["sendMessages"]>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const streamTools = (body as any).streamTools;

    if (this.opts.objectGeneration) {
      if (this.opts.stream) {
        return this.streamObject(messages, streamTools);
      } else {
        return this.generateObject(messages, streamTools);
      }
    }

    if (this.opts.stream) {
      // this can be used to simulate initial network errors
      // if (Math.random() < 0.5) {
      //   throw new Error("fake network error");
      // }

      const ret = await this.streamText(messages, streamTools);

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
