export type OEmbedCommon = {
  version: "1.0";
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  /** Optional extension, not required by oEmbed consumers. */
  description?: string;
  /** Optional unsized image hint; unlike thumbnail_url it has no dimension contract. */
  image_url?: string;
  /** Optional declared favicon/touch-icon/logo hint; no probing or fetching. */
  icon_url?: string;
};

export type OEmbedLink = OEmbedCommon & { type: "link" };
export type OEmbedPhoto = OEmbedCommon & {
  type: "photo";
  url: string;
  width: number;
  height: number;
};
export type OEmbedVideo = OEmbedCommon & {
  type: "video";
  html: string;
  width: number;
  height: number;
};
export type OEmbedRich = OEmbedCommon & {
  type: "rich";
  html: string;
  width: number;
  height: number;
};
export type OEmbedResponse =
  | OEmbedLink
  | OEmbedPhoto
  | OEmbedVideo
  | OEmbedRich;

export type EmbedResolver = { fetch(request: Request): Promise<Response> };
export type EmbedResolverOptions = {
  /** Public-network-only fetch honoring Request.signal. Global fetch alone is NOT sufficient. */
  protectedFetch: (request: Request) => Promise<Response>;
  /** Entire resolution, including all requests/body reads. Default: 5000. */
  timeoutMs?: number;
  /** Decoded HTML-head or whole JSON byte cap per resource. Default: 512 KiB. */
  maxResponseBytes?: number;
  /** Per-resource manual redirect bound. Default: 3. */
  maxRedirects?: number;
};
