import { decodeAny, encodeAny } from "lib0/buffer";
import type { VersionResult } from "../../extensions/Versioning/types.js";

export interface YHubClientOptions {
  /** API base URL, including the API prefix, without a trailing slash. */
  baseUrl: string;
  /** Organisation identifier. */
  org: string;
  /** Document identifier within the organisation. */
  docId: string;
  /** Headers included in every request, e.g. authentication tokens. */
  headers?: Record<string, string>;
  /** Bounds each request, including reading the response body. Defaults to 30 seconds. */
  timeoutMs?: number;
}

interface YHubActivityWireEntry<Metadata> {
  /** Start of the change window, in Unix milliseconds. */
  from: number;
  /** End of the change window, in Unix milliseconds. */
  to: number;
  /** Scalar when grouping by user; an author list when grouping across users. */
  by?: string | Array<string | null> | null;
  customAttributions?: Array<{ k: string; v: string }>;
  version?: YHubVersion<Metadata>;
}

export interface YHubVersion<Metadata = unknown> {
  type: "version:v1";
  t: number;
  name: string;
  custom: Metadata | null | undefined;
  updatedAt: number;
}

type YHubVersionCreate<Metadata> = Pick<
  YHubVersion<Metadata>,
  "type" | "t" | "name"
> & {
  custom?: Metadata | null;
};

type YHubVersionUpdate<Metadata> = Pick<
  YHubVersion<Metadata>,
  "type" | "t" | "name" | "custom" | "updatedAt"
>;

/** Activity with wire-format authors and attribution pairs normalized. */
export interface YHubActivityEntry<Metadata = unknown> {
  from: number;
  to: number;
  by: string[];
  customAttributions: Record<string, string>;
  version?: YHubVersion<Metadata>;
}

export interface YHubChangeset {
  /** Encoded document state at the requested timestamp. */
  ydoc?: Uint8Array;
  /** Encoded content map, when requested. */
  attributions?: Uint8Array;
}

export interface YHubDocument {
  doc: Uint8Array;
}

/** Query values are serialized without adding defaults. */
export type YHubQueryParams = Record<
  string,
  string | number | boolean | undefined
>;

export interface YHubRollbackParams {
  /** Inclusive start of the rollback window, in Unix milliseconds. */
  from: number;
  /** Encoded content IDs to roll back. */
  contentIds: Uint8Array;
}

/** Document-scoped REST operations; binary Yjs payloads remain encoded. */
export class YHubClient<Metadata = unknown> {
  private readonly baseUrl: string;
  private readonly documentPath: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor({
    baseUrl,
    org,
    docId,
    headers = {},
    timeoutMs = 30_000,
  }: YHubClientOptions) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("YHub timeout must be a positive finite number");
    }
    this.baseUrl = baseUrl;
    this.documentPath = `${encodeURIComponent(org)}/${encodeURIComponent(docId)}`;
    this.headers = headers;
    this.timeoutMs = timeoutMs;
  }

  private async request<Value>(
    endpoint: string,
    decode: (data: Uint8Array) => Value,
    params?: YHubQueryParams,
    init?: RequestInit,
  ): Promise<VersionResult<Value>> {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );
    const url = `${this.baseUrl}/${endpoint}/v1/${this.documentPath}${query.size ? `?${query}` : ""}`;
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("YHub requires an HTTP or HTTPS URL");
    }
    const headers = new Headers(this.headers);
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    let data: ArrayBuffer;
    try {
      const response = await fetch(url, { ...init, signal, headers });
      if (!response.ok) {
        return {
          ok: false,
          error:
            response.status === 401 || response.status === 403
              ? { type: "forbidden" }
              : response.status === 409 || response.status === 412
                ? { type: "conflict" }
                : response.status === 404
                  ? { type: "not-found" }
                  : { type: "server", status: response.status },
        };
      }
      data = await response.arrayBuffer();
    } catch (error) {
      if (init?.signal?.aborted) {
        throw error;
      }
      if (timeout.aborted) {
        return {
          ok: false,
          error: {
            type: "timeout",
            outcome: init?.method ? "unknown" : "unchanged",
          },
        };
      }
      // Fetch reports transport failures as TypeError. URL/configuration errors
      // are prevented by constructing and validating the URL before this boundary.
      if (error instanceof TypeError) {
        return { ok: false, error: { type: "network" } };
      }
      throw error;
    }
    // Decode outside the transport catch: malformed responses are unexpected errors.
    return { ok: true, value: decode(new Uint8Array(data)) };
  }

  async getVersion(
    t: number,
  ): Promise<VersionResult<YHubVersion<Metadata> | undefined>> {
    return this.request(
      "version",
      (data) => {
        const { versions } = decodeAny(data) as {
          versions: YHubVersion<Metadata>[];
        };
        return versions[0];
      },
      { from: t, to: t },
    );
  }

  async createVersion(
    t: number,
    name: string,
    custom?: Metadata | null,
  ): Promise<VersionResult<YHubVersion<Metadata>>> {
    const body = {
      type: "version:v1",
      t,
      name,
      ...(custom === undefined ? {} : { custom }),
    } satisfies YHubVersionCreate<Metadata>;
    return this.request(
      "version",
      (data) => decodeAny(data) as YHubVersion<Metadata>,
      undefined,
      { method: "POST", body: encodeAny(body) as BufferSource },
    );
  }

  async updateVersion(
    version: YHubVersion<Metadata>,
    name: string,
    custom: Metadata | null | undefined = version.custom,
  ): Promise<VersionResult<YHubVersion<Metadata>>> {
    const body = {
      type: "version:v1",
      t: version.t,
      updatedAt: version.updatedAt,
      name,
      custom,
    } satisfies YHubVersionUpdate<Metadata>;
    return this.request(
      "version",
      (data) => decodeAny(data) as YHubVersion<Metadata>,
      undefined,
      { method: "PATCH", body: encodeAny(body) as BufferSource },
    );
  }

  async deleteVersion(
    version: YHubVersion<Metadata>,
  ): Promise<VersionResult<void>> {
    return this.request(
      "version",
      () => undefined,
      {
        t: version.t,
        updatedAt: version.updatedAt,
      },
      { method: "DELETE" },
    );
  }

  async getActivity(
    params?: YHubQueryParams,
    signal?: AbortSignal,
  ): Promise<VersionResult<YHubActivityEntry<Metadata>[]>> {
    return this.request(
      "activity",
      (data) => {
        const { activity } = decodeAny(data) as {
          activity: YHubActivityWireEntry<Metadata>[];
        };
        return activity.map((entry) => ({
          ...entry,
          by: (Array.isArray(entry.by)
            ? entry.by
            : (entry.by?.split(",") ?? [])
          )
            .filter((id): id is string => id !== null)
            .map((id) => id.trim())
            .filter(Boolean),
          customAttributions: Object.fromEntries(
            entry.customAttributions?.map(({ k, v }) => [k, v]) ?? [],
          ),
        }));
      },
      params,
      { signal },
    );
  }

  async getChangeset(
    params?: YHubQueryParams,
    signal?: AbortSignal,
  ): Promise<VersionResult<YHubChangeset>> {
    return this.request(
      "changeset",
      (data) => decodeAny(data) as YHubChangeset,
      params,
      { signal },
    );
  }

  async getDocument(
    params?: YHubQueryParams,
  ): Promise<VersionResult<Uint8Array>> {
    return this.request(
      "ydoc",
      (data) => {
        const { doc } = decodeAny(data) as Partial<YHubDocument>;
        if (!doc) {
          throw new Error("YHub returned no document state.");
        }
        return doc;
      },
      params,
    );
  }

  async getContent(
    to: number,
    signal?: AbortSignal,
  ): Promise<VersionResult<Uint8Array>> {
    return this.request(
      "changeset",
      (data) => {
        const { ydoc } = decodeAny(data) as YHubChangeset;
        if (!ydoc) {
          throw new Error(
            `YHub returned no document state at timestamp ${to}.`,
          );
        }
        return ydoc;
      },
      { ydoc: true, to },
      { signal },
    );
  }

  async getAttributions(
    from: number,
    to?: number,
    signal?: AbortSignal,
  ): Promise<VersionResult<Uint8Array>> {
    return this.request(
      "changeset",
      (data) => {
        const { attributions } = decodeAny(data) as YHubChangeset;
        if (!attributions) {
          throw new Error("YHub returned no attributions.");
        }
        return attributions;
      },
      {
        from,
        to,
        attributions: true,
      },
      { signal },
    );
  }

  async rollback(params: YHubRollbackParams): Promise<VersionResult<void>> {
    return this.request("rollback", () => undefined, undefined, {
      method: "POST",
      body: encodeAny(params) as BufferSource,
    });
  }
}
