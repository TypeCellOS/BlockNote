import { ODTExporter } from "../odtExporter.js";

/**
 * Registers a picture (from a URL or data URL) with the exporter and returns
 * a paragraph embedding it, sized to the given dimensions (or the image's own
 * by default) and aligned as requested. Lets custom block mappings embed
 * images without having to build the ODT exporter's internal XML JSX elements
 * themselves.
 */
export const createODTImageParagraph = async (
  exporter: ODTExporter<any, any, any>,
  url: string,
  options?: {
    /**
     * Dimensions to render the image at. Defaults to the image's own.
     */
    width?: number;
    height?: number;
    /**
     * Horizontal alignment of the image within the paragraph.
     *
     * @default "left"
     */
    align?: "left" | "center" | "right";
  },
): Promise<React.ReactNode> => {
  const { path, mimeType, ...originalDimensions } =
    await exporter.registerPicture(url);
  const width = options?.width ?? originalDimensions.width;
  const height = options?.height ?? originalDimensions.height;

  const align = options?.align ?? "left";
  const styleName =
    align === "left"
      ? "Standard"
      : exporter.registerStyle((name) => (
          <style:style
            style:family="paragraph"
            style:name={name}
            style:parent-style-name="Standard"
          >
            <style:paragraph-properties
              fo:text-align={align === "center" ? "center" : "end"}
            />
          </style:style>
        ));

  return (
    <text:p text:style-name={styleName}>
      <draw:frame
        draw:style-name="Frame"
        style:rel-height="scale"
        style:rel-width={`${width}px`}
        svg:width={`${width}px`}
        svg:height={`${height}px`}
        text:anchor-type="as-char"
      >
        <draw:image
          xlink:type="simple"
          xlink:show="embed"
          xlink:actuate="onLoad"
          xlink:href={path}
          draw:mime-type={mimeType}
        />
      </draw:frame>
    </text:p>
  );
};
