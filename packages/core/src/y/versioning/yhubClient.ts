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

  async getVersion(t: number): Promise<YHubVersion<Metadata> | undefined> {
    const response = decodeAny(
      new Uint8Array(await this.request("version", { from: t, to: t })),
    ) as { versions: YHubVersion<Metadata>[] };
    return response.versions[0];
  }

  async createVersion(
    t: number,
    name: string,
    custom?: Metadata | null,
  ): Promise<YHubVersion<Metadata>> {
    const body = {
      type: "version:v1",
      t,
      name,
      ...(custom === undefined ? {} : { custom }),
    } satisfies YHubVersionCreate<Metadata>;
    return decodeAny(
      new Uint8Array(
        await this.request("version", undefined, {
          method: "POST",
          body: encodeAny(body) as BufferSource,
        }),
      ),
    ) as YHubVersion<Metadata>;
  }

  async updateVersion(
    version: YHubVersion<Metadata>,
    name: string,
    custom: Metadata | null | undefined = version.custom,
  ): Promise<YHubVersion<Metadata>> {
    const body = {
      type: "version:v1",
      t: version.t,
      updatedAt: version.updatedAt,
      name,
      custom,
    } satisfies YHubVersionUpdate<Metadata>;
    return decodeAny(
      new Uint8Array(
        await this.request("version", undefined, {
          method: "PATCH",
          body: encodeAny(body) as BufferSource,
        }),
      ),
    ) as YHubVersion<Metadata>;
  }

  async deleteVersion(version: YHubVersion<Metadata>): Promise<void> {
    await this.request(
      "version",
      {
        t: version.t,
        updatedAt: version.updatedAt,
      },
      { method: "DELETE" },
    );
  }

  async getActivity(
    params?: YHubQueryParams,
  ): Promise<YHubActivityEntry<Metadata>[]> {
    const buffer = await this.request("activity", params);
    const { activity } = decodeAny(new Uint8Array(buffer)) as {
      activity: YHubActivityWireEntry<Metadata>[];
    };
    return activity.map((entry) => ({
      ...entry,
      by: (Array.isArray(entry.by) ? entry.by : (entry.by?.split(",") ?? []))
        .filter((id): id is string => id !== null)
        .map((id) => id.trim())
        .filter(Boolean),
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
