import type { OEmbedCommon, OEmbedResponse } from "./types.js";

export function dimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Recognize usable media, not every detail of a provider's protocol dialect. */
export function validateOEmbed(fields: unknown): OEmbedResponse | undefined {
  if (!isRecord(fields)) {
    return undefined;
  }
  if (
    typeof fields.type !== "string" ||
    !["link", "photo", "video", "rich"].includes(fields.type)
  ) {
    return undefined;
  }
  const common: OEmbedCommon = { version: "1.0" };
  for (const key of [
    "title",
    "author_name",
    "provider_name",
    "description",
    "author_url",
    "provider_url",
    "image_url",
    "icon_url",
    "thumbnail_url",
  ] as const) {
    if (typeof fields[key] === "string") {
      common[key] = fields[key];
    }
  }
  for (const key of ["thumbnail_width", "thumbnail_height"] as const) {
    if (dimension(fields[key])) {
      common[key] = fields[key];
    }
  }
  if (dimension(fields.width) && dimension(fields.height)) {
    if (fields.type === "photo" && typeof fields.url === "string") {
      return {
        ...common,
        type: "photo",
        url: fields.url,
        width: fields.width,
        height: fields.height,
      };
    }
    if (
      (fields.type === "rich" || fields.type === "video") &&
      typeof fields.html === "string"
    ) {
      return {
        ...common,
        type: fields.type,
        html: fields.html,
        width: fields.width,
        height: fields.height,
      };
    }
  }
  return { ...common, type: "link" };
}
