import { decodeAny, encodeAny } from "lib0/buffer";

export interface YHubClientOptions {
  /** API base URL, including the API prefix, without a trailing slash. */
  baseUrl: string;
  /** Organisation identifier. */
  org: string;
  /** Document identifier within the organisation. */
  docId: string;
  /** Headers included in every request, e.g. authentication tokens. */
  headers?: Record<string, string>;
}

interface YHubActivityWireEntry {
  /** Start of the change window, in Unix milliseconds. */
  from: number;
  /** End of the change window, in Unix milliseconds. */
  to: number;
  /** Comma-separated user identifiers. */
  by?: string;
  customAttributions?: Array<{ k: string; v: string }>;
}

/** Activity with wire-format authors and attribution pairs normalized. */
export interface YHubActivityEntry {
  from: number;
  to: number;
  by: string[];
  customAttributions: Record<string, string>;
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
export class YHubClient {
  private readonly baseUrl: string;
  private readonly documentPath: string;
  private readonly headers: Record<string, string>;

  constructor({ baseUrl, org, docId, headers = {} }: YHubClientOptions) {
    this.baseUrl = baseUrl;
    this.documentPath = `${encodeURIComponent(org)}/${encodeURIComponent(docId)}`;
    this.headers = headers;
  }

  private async request(
    endpoint: string,
    params?: YHubQueryParams,
    init?: RequestInit,
  ): Promise<ArrayBuffer> {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );
    const url = `${this.baseUrl}/${endpoint}/v1/${this.documentPath}${query.size ? `?${query}` : ""}`;
    const response = await fetch(url, { ...init, headers: this.headers });
    if (!response.ok) {
      throw new Error(
        `YHub request failed: ${response.status} ${response.statusText} (${url})`,
      );
    }
    return response.arrayBuffer();
  }

  async getActivity(params?: YHubQueryParams): Promise<YHubActivityEntry[]> {
    const buffer = await this.request("activity", params);
    const { activity } = decodeAny(new Uint8Array(buffer)) as {
      activity: YHubActivityWireEntry[];
    };
    return activity.map((entry) => ({
      ...entry,
      by:
        entry.by
          ?.split(",")
          .map((id) => id.trim())
          .filter(Boolean) ?? [],
      customAttributions: Object.fromEntries(
        entry.customAttributions?.map(({ k, v }) => [k, v]) ?? [],
      ),
    }));
  }

  async getChangeset(params?: YHubQueryParams): Promise<YHubChangeset> {
    const buffer = await this.request("changeset", params);
    return decodeAny(new Uint8Array(buffer)) as YHubChangeset;
  }

  async getDocument(params?: YHubQueryParams): Promise<Uint8Array> {
    const buffer = await this.request("ydoc", params);
    const { doc } = decodeAny(new Uint8Array(buffer)) as Partial<YHubDocument>;
    if (!doc) {
      throw new Error("YHub returned no document state.");
    }
    return doc;
  }

  async getContent(to: number): Promise<Uint8Array> {
    const { ydoc } = await this.getChangeset({ ydoc: true, to });
    if (!ydoc) {
      throw new Error(`YHub returned no document state at timestamp ${to}.`);
    }
    return ydoc;
  }

  async getAttributions(from: number, to?: number): Promise<Uint8Array> {
    const { attributions } = await this.getChangeset({
      from,
      to,
      attributions: true,
    });
    if (!attributions) {
      throw new Error("YHub returned no attributions.");
    }
    return attributions;
  }

  async rollback(params: YHubRollbackParams): Promise<void> {
    await this.request("rollback", undefined, {
      method: "POST",
      body: encodeAny(params) as BufferSource,
    });
  }
}
