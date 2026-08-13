import {
  bytesToBase64,
  ExportImage,
  exportImageToDataURL,
} from "@blocknote/core";

/**
 * How generated images (math formulas, diagrams) find their way into an
 * email. Mappings that generate images take a delivery via their factory
 * options, hand it the generated {@link ExportImage}, and use the returned
 * string as the `<img>` src.
 *
 * Custom deliveries can implement any transport: `deliver` registers the
 * image and synchronously returns the reference to embed (a data URL, a
 * `cid:`, a content-addressed hosted URL, ...); work that can't happen
 * during rendering - uploading, attaching - happens after the email is
 * rendered, from what was registered (see {@link createCIDImageDelivery}
 * for this pattern).
 */
export type ReactEmailImageDelivery = {
  /**
   * Registers a generated image and returns the `src` to reference it with
   * in the email body. Must be synchronous: some inline content renders
   * synchronously.
   *
   * @param image - The generated image, plus a short `name` for the image
   * kind (e.g. "math"), used for attachment filenames.
   */
  deliver: (image: ExportImage & { name: string }) => string;
};

/**
 * Embeds images directly in the email body as data URLs. Self-contained (no
 * attachments to manage), but some email clients (notably Gmail and Outlook
 * for Windows) don't display data URL images.
 */
export const dataURLImageDelivery: ReactEmailImageDelivery = {
  deliver: (image) => exportImageToDataURL(image),
};

/**
 * Delivers images as inline email attachments, referenced from the body via
 * `cid:` URLs (RFC 2392) - the most widely supported way to embed generated
 * images (works in Gmail and Outlook, which both block data URLs).
 *
 * Attaching happens at send time: after rendering the email, pass
 * `attachments` to your mailer alongside the HTML. The attachment objects
 * use the field names of nodemailer & compatible APIs:
 *
 * ```ts
 * const imageDelivery = createCIDImageDelivery();
 * const exporter = new ReactEmailExporter(schema, {
 *   ...reactEmailDefaultSchemaMappings,
 *   blockMapping: {
 *     ...reactEmailDefaultSchemaMappings.blockMapping,
 *     math: createMathBlockMapping({ imageDelivery }),
 *   },
 * });
 * const html = await exporter.toReactEmailDocument(blocks);
 *
 * await transporter.sendMail({ html, attachments: imageDelivery.attachments });
 * ```
 *
 * Create one delivery per rendered email - the attachment list accumulates
 * across renders otherwise.
 */
export function createCIDImageDelivery(): ReactEmailImageDelivery & {
  attachments: {
    cid: string;
    filename: string;
    content: string;
    encoding: "base64";
    contentType: string;
    contentDisposition: "inline";
  }[];
} {
  const attachments: ReturnType<typeof createCIDImageDelivery>["attachments"] =
    [];

  return {
    attachments,
    deliver: (image) => {
      const cid = `${image.name}-${attachments.length + 1}@blocknote`;
      const extension = image.mimeType.split("/")[1]?.split("+")[0] ?? "bin";
      attachments.push({
        cid,
        filename: `${image.name}-${attachments.length + 1}.${extension}`,
        content: bytesToBase64(image.data),
        encoding: "base64",
        contentType: image.mimeType,
        contentDisposition: "inline",
      });

      return `cid:${cid}`;
    },
  };
}
