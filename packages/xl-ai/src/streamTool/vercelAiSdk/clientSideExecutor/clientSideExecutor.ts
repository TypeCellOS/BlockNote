import {
  LanguageModel,
  ModelMessage,
  generateObject,
  jsonSchema,
  streamObject,
} from "ai";
import { ExecuteLLMRequestOptions } from "../../../api/LLMRequest.js";
import { LLMResponse } from "../../../api/LLMResponse.js";
import { createStreamToolsArraySchema } from "../../jsonSchema.js";
import { StreamTool } from "../../streamTool.js";
import { dataStreamResponseToOperationsResult } from "../util/dataStreamResponseToOperationsResult.js";
import {
  objectToDataStream,
  partialObjectStreamToDataStream,
} from "../util/partialObjectStreamUtil.js";

type LLMRequestOptions = {
  model: LanguageModel;
  messages: ModelMessage[];
  maxRetries: number;
};

/**
 * Calls an LLM with StreamTools, using the `generateObject` of the AI SDK.
 *
 * This is the non-streaming version.
 */
export async function generateOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  },
) {
  const { _generateObjectOptions, model, ...rest } = opts;

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
    ...rest,

    // extra options for streamObject
    ...((_generateObjectOptions ?? {}) as any),
  };

  const ret = await generateObject<any, any, { operations: any }>(options);

  const stream = objectToDataStream(ret.object);

  return {
    dataStreamResponse: new Response(
      stream.pipeThrough(new TextEncoderStream()),
      {
        status: 200,
        statusText: "OK",
        headers: {
          contentType: "text/plain; charset=utf-8",
          dataStreamVersion: "v1",
        },
      },
    ),
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
export async function streamOperations<T extends StreamTool<any>[]>(
  streamTools: T,
  opts: LLMRequestOptions & {
    _streamObjectOptions?: Partial<
      Parameters<typeof streamObject<any, any, { operations: any[] }>>[0]
    >;
  },
) {
  const { _streamObjectOptions, model, ...rest } = opts;

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
    ...rest,

    // extra options for streamObject
    ...((opts._streamObjectOptions ?? {}) as any),
  };

  const ret = streamObject<any, any, { operations: any }>(options);

  // Transform the partial object stream to a data stream format
  const stream = partialObjectStreamToDataStream(ret.fullStream);

  return {
    dataStreamResponse: new Response(
      stream.pipeThrough(new TextEncoderStream()),
      {
        status: 200,
        statusText: "OK",
        headers: {
          contentType: "text/plain; charset=utf-8",
          dataStreamVersion: "v1",
        },
      },
    ),
    /**
     * Result of the underlying `streamObject` (AI SDK) call, or `undefined` if non-streaming mode
     */
    streamObjectResult: ret,
  };
}

export function createAISDKLLMRequestExecutor(opts: {
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
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  /**
   * Additional options to pass to the AI SDK `streamObject` function
   * (only used when `stream` is `true`)
   */
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
}) {
  const {
    model,
    stream,
    maxRetries,
    _generateObjectOptions,
    _streamObjectOptions,
  } = opts;
  return async (opts: ExecuteLLMRequestOptions) => {
    const { messages, streamTools, onStart } = opts;

    // TODO: add support for streamText / generateText and tool calls

    let response: // | Awaited<ReturnType<typeof generateOperations<any>>>
    Awaited<ReturnType<typeof streamOperations<any>>>;

    if (stream) {
      response = await streamOperations(streamTools, {
        messages,
        model,
        maxRetries,
        ...(_streamObjectOptions as any),
      });
    } else {
      response = (await generateOperations(streamTools, {
        messages,
        model,
        maxRetries,
        ...(_generateObjectOptions as any),
      })) as any;
    }

    const parsedResponse = await dataStreamResponseToOperationsResult(
      response.dataStreamResponse,
      streamTools,
      onStart,
    );
    return new LLMResponse(messages, parsedResponse, streamTools);
  };
}
