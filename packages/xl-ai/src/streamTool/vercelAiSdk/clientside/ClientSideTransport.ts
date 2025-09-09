import {
  ChatTransport,
  LanguageModel,
  UIMessage,
  UIMessageChunk,
  convertToModelMessages,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";
import { createStreamToolsArraySchema } from "../../jsonSchema.js";
import { StreamTool } from "../../streamTool.js";
import {
  objectToUIMessageStream,
  partialObjectStreamToUIMessageStream,
} from "../util/partialObjectStreamUtil.js";

type LLMRequestOptions = {
  model: LanguageModel;
  messages: UIMessage[];
  maxRetries: number;
};

/**
 * Calls an LLM with StreamTools, using the `generateObject` of the AI SDK.
 *
 * This is the non-streaming version.
 */
async function generateOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  },
) {
  const { _generateObjectOptions, model, messages, ...rest } = opts;

  if (typeof model === "string") {
    throw new Error("model must be a LanguageModelV2");
  }

  if (
    _generateObjectOptions &&
    ("output" in _generateObjectOptions || "schema" in _generateObjectOptions)
  ) {
    throw new Error(
      "Cannot provide output or schema in _generateObjectOptions",
    );
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));
  const options = {
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

    //  - mandatory ones:
    ...rest,

    // extra options for streamObject
    ...((_generateObjectOptions ?? {}) as any),
  } as const;
  const ret = await generateObject<any, any, { operations: any }>(options);

  const stream = objectToUIMessageStream(ret.object);

  return {
    uiMessageStream: stream,
    /**
     * Result of the underlying `generateObject` (AI SDK) call, or `undefined` if streaming mode
     */
    generateObjectResult: ret,
  };
}

/**
 * Calls an LLM with StreamTools, using the `streamObject` of the AI SDK.
 *
 * This is the streaming version.
 */
async function streamOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _streamObjectOptions?: Partial<
      Parameters<typeof streamObject<any, any, { operations: any[] }>>[0]
    >;
  },
) {
  const { _streamObjectOptions, model, messages, ...rest } = opts;

  if (typeof model === "string") {
    throw new Error("model must be a LanguageModelV2");
  }

  if (
    _streamObjectOptions &&
    ("output" in _streamObjectOptions || "schema" in _streamObjectOptions)
  ) {
    throw new Error("Cannot provide output or schema in _streamObjectOptions");
  }

  const schema = jsonSchema(createStreamToolsArraySchema(streamTools));

  const options = {
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
    ...rest,

    // extra options for streamObject
    ...((opts._streamObjectOptions ?? {}) as any),
  } as const;

  const ret = streamObject<any, any, { operations: any }>(options);

  // Transform the partial object stream to a data stream format
  const stream = partialObjectStreamToUIMessageStream(ret.fullStream);

  return {
    uiMessageStream: stream,
    /**
     * Result of the underlying `streamObject` (AI SDK) call, or `undefined` if non-streaming mode
     */
    streamObjectResult: ret,
  };
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
       * Whether to stream the LLM response or not
       *
       * When streaming, we use the AI SDK `streamObject` function,
       * otherwise, we use the AI SDK `generateObject` function.
       *
       * @default true
       */
      stream?: boolean;

      /**
       * The maximum number of retries for the LLM call
       *
       * @default 2
       */
      maxRetries?: number;

      /**
       * Additional options to pass to the AI SDK `generateObject` function
       * (only used when `stream` is `false`)
       */
      _generateObjectOptions?: Partial<
        Parameters<typeof generateObject<any>>[0]
      >;
      /**
       * Additional options to pass to the AI SDK `streamObject` function
       * (only used when `stream` is `true`)
       */
      _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
    },
  ) {}

  async sendMessages({
    messages,
    body,
  }: Parameters<ChatTransport<UI_MESSAGE>["sendMessages"]>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const { streamTools } = body as { streamTools: StreamTool<any>[] };
    let response: // | Awaited<ReturnType<typeof generateOperations<any>>>
    Awaited<ReturnType<typeof streamOperations<any>>>;

    if (this.opts.stream) {
      response = await streamOperations(streamTools, {
        messages,
        model: this.opts.model,
        maxRetries: this.opts.maxRetries,
        ...(this.opts._streamObjectOptions as any),
      });
    } else {
      response = (await generateOperations(streamTools, {
        messages,
        model: this.opts.model,
        maxRetries: this.opts.maxRetries,
        ...(this.opts._generateObjectOptions as any),
      })) as any;
    }
    return response.uiMessageStream;
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    throw new Error("Not implemented");
  }
}
