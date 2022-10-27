import styles from "./Toolbar.module.css";
import { Group, MantineProvider } from "@mantine/core";

export const Toolbar = (props: { children: any }) => {
  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        activeStyles: {
          // Removes button press effect.
          transform: "none",
        },
        colorScheme: "light",
        colors: {
          brand: [
            "#a2aab8",
            "#8b95a6",
            "#748094",
            "#5d6b82",
            "#455571",
            "#2e405f",
            "#172b4d",
            "#152745",
            "#12223e",
            "#101e36",
          ],
          brandFinal: [
            "#F6F6F8",
            "#ECEDF0",
            "#DFE1E6",
            "#C2C7D0",
            "#A6ADBA",
            "#8993A4",
            "#6D798F",
            "#505F79",
            "#344563",
            "#172B4D",
          ],
        },
        fontFamily: "Inter",
        primaryColor: "brandFinal",
        primaryShade: 9,
      }}>
      <Group p={2} className={styles.toolbar} noWrap grow={false} spacing={2}>
        {props.children}
      </Group>
    </MantineProvider>
  );
};
