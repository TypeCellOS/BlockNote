import { Box, Group, MantineProvider } from "@mantine/core";

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
        components: {
          Menu: {
            styles: (theme) => ({
              item: {
                fontSize: "12px",
                color: theme.colors.brandFinal,
              },
              // Adds some space between the item text and selection tick
              itemRightSection: {
                paddingLeft: "10px",
              },
            }),
          },
        },
        fontFamily: "Inter",
        primaryColor: "brandFinal",
        primaryShade: 9,
      }}>
      <Box
        sx={(theme) => ({
          backgroundColor: "white",
          boxShadow:
            "0px 4px 8px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.21)",
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
          width: "fit-content",
        })}>
        <Group p={2} noWrap grow={false} spacing={2}>
          {props.children}
        </Group>
      </Box>
    </MantineProvider>
  );
};
