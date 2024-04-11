import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const Panel = (props: ComponentProps["ImagePanel"]["Root"]) => (
  <Mantine.Group className={props.className}>
    <Mantine.Tabs value={props.openTab} onChange={props.setOpenTab as any}>
      {props.loading && <Mantine.LoadingOverlay visible={props.loading} />}

      <Mantine.Tabs.List>
        {props.tabs.map((tab) => (
          <Mantine.Tabs.Tab value={tab.name} key={tab.name}>
            {tab.name}
          </Mantine.Tabs.Tab>
        ))}
      </Mantine.Tabs.List>

      {props.tabs.map((tab) => (
        <Mantine.Tabs.Panel value={tab.name} key={tab.name}>
          {tab.tabPanel}
        </Mantine.Tabs.Panel>
      ))}
    </Mantine.Tabs>
  </Mantine.Group>
);
