export const ColorIcon = (
  props: Partial<{
    textColor: string | undefined;
    backgroundColor: string | undefined;
    fontSize: string | undefined;
  }>
) => {
  const textColor = props.textColor || "black";
  const backgroundColor = props.backgroundColor || "transparent";
  const fontSize = props.fontSize || "1em";

  return (
    <div
      style={{
        backgroundColor: backgroundColor,
        border: "solid #D3D3D3 1px",
        borderRadius: "4px",
        paddingInline: "4px",
        color: textColor,
        fontSize: fontSize,
      }}>
      A
    </div>
  );
};
