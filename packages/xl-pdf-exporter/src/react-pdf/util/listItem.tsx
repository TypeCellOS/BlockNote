import { Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { Style } from "../types.js";

// https://github.com/diegomura/react-pdf/issues/134

const PIXELS_PER_POINT = 0.75;

const styles = StyleSheet.create({
  listItem: {
    display: "flex",
    flexDirection: "row",
    gap: 8 * PIXELS_PER_POINT,
    paddingRight: 10, // otherwise text overflows, seems like a react-pdf / yoga bug
  },
  bullet: {
    // fontFamily: "", // we could add symbol font if we don't want to use inter (default font) here
  },
});

export const BULLET_MARKER = "\u2022";

// https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
export const CHEVRON_MARKER = (
  <Svg
    style={{ marginTop: 2 }}
    height="12"
    viewBox="0 -960 960 960"
    width="12"
    fill="undefined"
  >
    <Path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z" />
  </Svg>
);

// https://fonts.google.com/icons?selected=Material+Symbols+Outlined:check_box_outline_blank:FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=undefined
export const CHECK_MARKER_UNCHECKED = (
  <Svg
    style={{ marginTop: 2 }}
    height="12"
    viewBox="0 -960 960 960"
    width="12"
    fill="undefined"
  >
    <Path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Z" />
  </Svg>
);

// https://fonts.google.com/icons?selected=Material+Symbols+Outlined:check_box:FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=undefined
export const CHECK_MARKER_CHECKED = (
  <Svg
    style={{ marginTop: 2 }}
    height="12"
    viewBox="0 -960 960 960"
    width="12"
    fill="undefined"
  >
    <Path d="m424-312 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z" />
  </Svg>
);

export const ListItem = ({
  listMarker,
  children,
  style,
}: {
  listMarker: string | React.ReactNode;
  children: React.ReactNode;
  style?: Style;
}) => {
  return (
    <View style={[styles.listItem, style || {}]}>
      <View style={styles.bullet}>
        {/* <Svg width={2} height={2}>
            <Circle cx="1" cy="1" r="2" fill="black" />
          </Svg> */}
        {typeof listMarker === "string" ? (
          <Text>{listMarker}</Text>
        ) : (
          listMarker
        )}
      </View>
      {children}
    </View>
  );
};
