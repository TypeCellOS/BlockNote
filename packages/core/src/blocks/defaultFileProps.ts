import * as z from "zod/v4";

export const baseFilePropSchema = z.object({
  caption: z.string().default(""), // TODO: "" as defaults?
  name: z.string().default(""),
});

export const optionalFileProps = z.object({
  // URL is optional, as we also want to accept files with no URL, but for example ids
  // (ids can be used for files that are resolved on the backend)
  url: z.string().default(""),
  // Whether to show the file preview or the name only.
  // This is useful for some file blocks, but not all
  // (e.g.: not relevant for default "file" block which doesn;'t show previews)
  showPreview: z.boolean().default(true),
  // File preview width in px.
  previewWidth: z.number().optional(),
});
